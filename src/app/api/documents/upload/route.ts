import { NextRequest } from 'next/server';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { buildRateLimitSubjectFromRequest, checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import {
  ALLOWED_TYPES,
  CONTROLLED_DOCUMENT_STORAGE_BUCKET,
  MAX_UPLOAD_BYTES,
  UPLOAD_SECURITY_AUDIT_EVENTS,
  buildTenantScopedUploadPath,
  buildUploadSecurityAuditMetadata,
  sanitizeUploadFileName,
  scanValidatedUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadSecurityFile,
  type MalwareScanResult,
} from '@/server/security/upload-security';

const STORAGE_BUCKET = CONTROLLED_DOCUMENT_STORAGE_BUCKET;
// The controlled-documents bucket is the only storage bucket permitted for enterprise document uploads.
const SIGNATURE_MISMATCH_REASON = 'signature_mismatch';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MULTIPART_UPLOAD_OVERHEAD_BYTES = 256 * 1024;
const MAX_MULTIPART_UPLOAD_BYTES = MAX_UPLOAD_BYTES + MULTIPART_UPLOAD_OVERHEAD_BYTES;

function safeDocumentTitle(name: string) {
  return sanitizeUploadFileName(name)
    .replace(/\.[^.]+$/, '')
    .trim()
    .slice(0, 120) || 'Controlled document';
}

function blockedScanStatus(scan: MalwareScanResult) {
  if (scan.status === 'not_configured' || scan.status === 'unavailable') return 503;
  return 422;
}

function uuidOrNull(value: string | null | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function parseContentLength(request: NextRequest) {
  const raw = request.headers.get('content-length');
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function rejectOversizedMultipartRequest(request: NextRequest) {
  const contentLength = parseContentLength(request);

  if (contentLength !== null && contentLength > MAX_MULTIPART_UPLOAD_BYTES) {
    return noStoreJson({ error: 'Upload request is too large.' }, { status: 413 });
  }

  return null;
}

function preScanAuditMetadata(input: {
  reason?: string | null;
  file: File;
  organizationId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  fileHash?: string | null;
  detectedMimeType?: string | null;
  declaredSignatureMatches?: boolean | null;
}) {
  return buildUploadSecurityAuditMetadata({
    reason: input.reason ?? null,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? 'unknown',
    fileHash: input.fileHash ?? null,
    fileSize: input.file.size,
    claimedMimeType: input.file.type,
    mimeDetected: input.detectedMimeType ?? null,
    declaredSignatureMatches: input.declaredSignatureMatches ?? null,
    accessPurpose: 'upload',
  });
}

async function auditUploadSecurityEvent(input: {
  action: string;
  organizationId: string;
  actorUserId: string;
  entityId?: string | null;
  metadata: Record<string, unknown>;
}) {
  await createAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: 'document',
    entityId: input.entityId ?? input.organizationId,
    metadata: input.metadata,
  });
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const oversizedRequest = rejectOversizedMultipartRequest(request);
  if (oversizedRequest) return oversizedRequest;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization access required.' }, { status: 403 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_documents',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    ...buildRateLimitSubjectFromRequest(request, {
      userId: user.id,
      organizationId: organization.id,
      action: 'documents_upload',
      route: '/api/documents/upload',
    }),
    key: `documents:upload:${organization.id}:${user.id}`,
    policy: 'upload',
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const quota = await assertDocumentQuota(organization.id);

  if (!quota.ok) {
    return noStoreJson(
      {
        error: quota.error,
        message: quota.message,
        plan: quota.entitlements.plan,
        currentCount: quota.currentCount,
      },
      { status: quota.status },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return noStoreJson({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return noStoreJson({ error: 'File is required.' }, { status: 400 });
  }

  await auditUploadSecurityEvent({
    action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadRequested,
    organizationId: organization.id,
    actorUserId: user.id,
    metadata: preScanAuditMetadata({
      file,
      organizationId: organization.id,
      actorUserId: user.id,
      actorRole: permission.role,
    }),
  });

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    const metadata = preScanAuditMetadata({
      reason: 'invalid_size',
      file,
      organizationId: organization.id,
      actorUserId: user.id,
      actorRole: permission.role,
    });

    await Promise.all([
      auditUploadSecurityEvent({
        action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
      auditUploadSecurityEvent({
        action: 'document_upload_rejected',
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: 'File must be between 1 byte and 10 MB.' }, { status: 413 });
  }

  const uploadValidation = await validateUploadSecurityFile(file, { maxBytes: MAX_UPLOAD_BYTES });

  if (!uploadValidation.ok) {
    const metadata = preScanAuditMetadata({
      reason: uploadValidation.reason === SIGNATURE_MISMATCH_REASON ? SIGNATURE_MISMATCH_REASON : uploadValidation.reason,
      file,
      organizationId: organization.id,
      actorUserId: user.id,
      actorRole: permission.role,
      fileHash: uploadValidation.fileHash,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    });

    await Promise.all([
      auditUploadSecurityEvent({
        action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
      auditUploadSecurityEvent({
        action: 'document_upload_rejected',
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: uploadValidation.message }, { status: uploadValidation.reason === 'file_too_large' ? 413 : 415 });
  }

  const extension = ALLOWED_TYPES.get(uploadValidation.mimeDetected) ?? uploadValidation.extension;

  if (!extension) {
    const metadata = preScanAuditMetadata({
      reason: 'unsupported_mime_type',
      file,
      organizationId: organization.id,
      actorUserId: user.id,
      actorRole: permission.role,
      fileHash: uploadValidation.fileHash,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    });

    await Promise.all([
      auditUploadSecurityEvent({
        action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
      auditUploadSecurityEvent({
        action: 'document_upload_rejected',
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.' }, { status: 415 });
  }

  const scan = await scanValidatedUploadForMalware({
    validation: uploadValidation,
    organizationId: organization.id,
  });
  const scanMetadata = buildUploadSecurityAuditMetadata({
    scan,
    fileHash: uploadValidation.fileHash,
    fileSize: uploadValidation.fileSize,
    claimedMimeType: uploadValidation.claimedMimeType,
    mimeDetected: uploadValidation.mimeDetected,
    organizationId: organization.id,
    actorUserId: user.id,
    actorRole: permission.role,
    declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    accessPurpose: 'upload',
  });

  await auditUploadSecurityEvent({
    action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadScanned,
    organizationId: organization.id,
    actorUserId: user.id,
    metadata: scanMetadata,
  });

  if (shouldBlockUploadForMalwareScan(scan)) {
    const metadata = {
      ...scanMetadata,
      reason: 'malware_scan_not_clean',
      scanReason: scan.reason ?? null,
    };

    await Promise.all([
      auditUploadSecurityEvent({
        action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
      auditUploadSecurityEvent({
        action: 'document_upload_rejected',
        organizationId: organization.id,
        actorUserId: user.id,
        metadata,
      }),
    ]);

    return noStoreJson(
      {
        error: 'Document upload was blocked by content scanning policy.',
        scan: {
          status: scan.status,
          provider: scan.provider,
          required: scan.required,
        },
      },
      { status: blockedScanStatus(scan) },
    );
  }

  const storagePath = buildTenantScopedUploadPath({
    organizationId: organization.id,
    userId: user.id,
    extension,
  });

  const title = safeDocumentTitle(file.name);
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return noStoreJson({ error: 'Secure document storage is not configured.' }, { status: 503 });
  }

  const storage = supabase.storage.from(STORAGE_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, uploadValidation.buffer, {
    contentType: uploadValidation.mimeDetected,
    upsert: false,
  });

  if (uploadError) {
    console.warn('[documents] upload_failed', { code: uploadError.message ? 'storage_error' : 'unknown' });

    return noStoreJson({ error: 'Unable to store document securely.' }, { status: 500 });
  }

  const uploadedBy = uuidOrNull(user.id);
  const { data: persistedDocument, error: documentError } = await supabase
    .from('documents')
    .insert({
      organization_id: organization.id,
      uploaded_by: uploadedBy,
      name: title,
      category: 'controlled-document',
      status: 'pending',
      storage_path: storagePath,
      checksum_sha256: uploadValidation.fileHash,
      mime_type: uploadValidation.mimeDetected,
      size_bytes: uploadValidation.fileSize,
      scan_status: scan.status,
      scan_provider: scan.provider,
      scan_required: scan.required,
      scan_checked_at: scan.scannedAt,
      file_hash: uploadValidation.fileHash,
      file_size: uploadValidation.fileSize,
      mime_detected: uploadValidation.mimeDetected,
    })
    .select('id,name,status,created_at')
    .single();

  if (documentError) {
    await storage.remove([storagePath]);
    console.warn('[documents] metadata_insert_failed', { code: documentError.code ?? 'unknown' });

    return noStoreJson({ error: 'Unable to register document securely.' }, { status: 500 });
  }

  await createNotification({
    organizationId: organization.id,
    type: 'document_uploaded',
    title: 'Controlled document uploaded',
    message: `${title} was uploaded and is pending review.`,
    metadata: {
      documentId: persistedDocument.id,
      status: persistedDocument.status,
    },
  });

  await auditUploadSecurityEvent({
    action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadAccepted,
    organizationId: organization.id,
    actorUserId: user.id,
    entityId: persistedDocument.id,
    metadata: {
      ...scanMetadata,
      documentId: persistedDocument.id,
      storagePathRecorded: true,
      name: title,
      uploadedBy,
    },
  });

  return noStoreJson(
    {
      document: persistedDocument,
      scan: {
        status: scan.status,
        provider: scan.provider,
        required: scan.required,
      },
    },
    { status: 201 },
  );
}
