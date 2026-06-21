import { NextRequest } from 'next/server';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_AUDIT_EVENTS,
  buildTenantIsolatedUploadStoragePath,
  buildUploadSecurityMetadata,
  sanitizeUploadFilename,
  scanUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadPayload,
  type MalwareScanResult,
} from '@/server/security/upload-security';

const STORAGE_BUCKET = 'controlled-documents';
const SIGNATURE_MISMATCH_REASON = 'signature_mismatch';

function safeDocumentTitle(name: string) {
  return sanitizeUploadFilename(name)
    .replace(/\.[^.]+$/, '')
    .trim()
    .slice(0, 120) || 'Controlled document';
}

function blockedScanStatus(scan: MalwareScanResult) {
  if (scan.status === 'not_configured' || scan.status === 'unavailable') return 503;
  return 422;
}

function preScanAuditMetadata(input: {
  reason: string;
  file: File;
  actorRole?: string | null;
  fileHash?: string | null;
  detectedMimeType?: string | null;
  declaredSignatureMatches?: boolean | null;
  organizationId?: string | null;
  actorUserId?: string | null;
}) {
  return {
    ...buildUploadSecurityMetadata({
      reason: input.reason,
      fileHash: input.fileHash ?? null,
      fileSize: input.file.size,
      mimeDetected: input.detectedMimeType ?? null,
      claimedMimeType: input.file.type,
      declaredSignatureMatches: input.declaredSignatureMatches ?? null,
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
    }),
    actorRole: input.actorRole ?? 'unknown',
  };
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

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
    key: `documents:upload:${organization.id}:${user.id}`,
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

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: UPLOAD_AUDIT_EVENTS.uploadRequested,
    entityType: 'document',
    entityId: organization.id,
    metadata: preScanAuditMetadata({
      reason: 'upload_requested',
      file,
      actorRole: permission.role,
      organizationId: organization.id,
      actorUserId: user.id,
    }),
  });

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    const metadata = preScanAuditMetadata({
      reason: 'invalid_size',
      file,
      actorRole: permission.role,
      organizationId: organization.id,
      actorUserId: user.id,
    });

    await Promise.all([
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: UPLOAD_AUDIT_EVENTS.uploadBlocked,
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'document_upload_rejected',
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: 'File must be between 1 byte and 10 MB.' }, { status: 413 });
  }

  const uploadValidation = await validateUploadPayload({ file, maxBytes: MAX_UPLOAD_BYTES });

  if (!uploadValidation.ok) {
    const metadata = preScanAuditMetadata({
      reason: uploadValidation.reason === SIGNATURE_MISMATCH_REASON ? SIGNATURE_MISMATCH_REASON : uploadValidation.reason,
      file,
      actorRole: permission.role,
      fileHash: uploadValidation.fileHash ?? null,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
      organizationId: organization.id,
      actorUserId: user.id,
    });

    await Promise.all([
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: UPLOAD_AUDIT_EVENTS.uploadBlocked,
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'document_upload_rejected',
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: uploadValidation.message }, { status: uploadValidation.reason === 'file_too_large' ? 413 : 415 });
  }

  const extension = ALLOWED_TYPES.get(uploadValidation.validation.mimeType);

  if (!extension) {
    const metadata = preScanAuditMetadata({
      reason: 'unsupported_mime_type',
      file,
      actorRole: permission.role,
      fileHash: uploadValidation.fileHash,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
      detectedMimeType: uploadValidation.mimeDetected,
      organizationId: organization.id,
      actorUserId: user.id,
    });

    await Promise.all([
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: UPLOAD_AUDIT_EVENTS.uploadBlocked,
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'document_upload_rejected',
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
    ]);

    return noStoreJson({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.' }, { status: 415 });
  }

  const scan = await scanUploadForMalware({
    buffer: uploadValidation.buffer,
    mimeType: uploadValidation.validation.mimeType,
    filename: uploadValidation.sanitizedFileName,
    organizationId: organization.id,
    fileHash: uploadValidation.fileHash,
  });
  const scanMetadata = {
    ...buildUploadSecurityMetadata({
      scan,
      fileHash: uploadValidation.fileHash,
      fileSize: file.size,
      mimeDetected: uploadValidation.mimeDetected,
      claimedMimeType: file.type,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
      organizationId: organization.id,
      actorUserId: user.id,
    }),
    actorRole: permission.role ?? 'unknown',
  };

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: UPLOAD_AUDIT_EVENTS.uploadScanned,
    entityType: 'document',
    entityId: organization.id,
    metadata: scanMetadata,
  });

  if (shouldBlockUploadForMalwareScan(scan)) {
    const metadata = {
      ...scanMetadata,
      reason: 'malware_scan_not_clean',
    };

    await Promise.all([
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: UPLOAD_AUDIT_EVENTS.uploadBlocked,
        entityType: 'document',
        entityId: organization.id,
        metadata,
      }),
      createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'document_upload_rejected',
        entityType: 'document',
        entityId: organization.id,
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

  const storagePath = buildTenantIsolatedUploadStoragePath({
    organizationId: organization.id,
    actorUserId: user.id,
    extension,
  });

  const title = safeDocumentTitle(file.name);
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return noStoreJson({ error: 'Secure document storage is not configured.' }, { status: 503 });
  }

  const storage = supabase.storage.from(STORAGE_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, uploadValidation.buffer, {
    contentType: uploadValidation.validation.mimeType,
    upsert: false,
  });

  if (uploadError) {
    console.warn('[documents] upload_failed', { code: uploadError.message ? 'storage_error' : 'unknown' });

    return noStoreJson({ error: 'Unable to store document securely.' }, { status: 500 });
  }

  const { data: persistedDocument, error: documentError } = await supabase
    .from('documents')
    .insert({
      organization_id: organization.id,
      uploaded_by: user.id,
      name: title,
      category: 'controlled-document',
      status: 'pending',
      storage_path: storagePath,
      checksum_sha256: uploadValidation.fileHash,
      mime_type: uploadValidation.validation.mimeType,
      size_bytes: file.size,
      scan_status: scan.status,
      scan_provider: scan.provider,
      scan_required: scan.required,
      scan_checked_at: scan.scannedAt,
      file_hash: uploadValidation.fileHash,
      file_size: file.size,
      mime_detected: uploadValidation.mimeDetected,
      upload_security_metadata: scanMetadata,
    })
    .select('id,name,status,created_at')
    .single();

  if (documentError) {
    await storage.remove([storagePath]);
    console.warn('[documents] metadata_create_failed', { code: documentError.code ?? 'unknown' });

    return noStoreJson({ error: 'Unable to register document metadata.' }, { status: 500 });
  }

  const document = {
    id: persistedDocument?.id,
    title: persistedDocument?.name ?? title,
    status: persistedDocument?.status ?? 'pending',
    version: 1,
    created_at: persistedDocument?.created_at ?? null,
  };

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'document_uploaded',
    entityType: 'document',
    entityId: document.id,
    metadata: {
      title,
      plan: quota.entitlements.plan,
      documentCountBeforeUpload: quota.currentCount,
      storagePath,
      ...scanMetadata,
    },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'document',
    message: `Documento ${title} carregado para revisão.`,
  });

  return noStoreJson({
    document,
    checksum: uploadValidation.fileHash,
    scan: {
      status: scan.status,
      provider: scan.provider,
      required: scan.required,
    },
    plan: quota.entitlements.plan,
    remainingDocuments: Number.isFinite(quota.entitlements.maxDocuments)
      ? Math.max(quota.entitlements.maxDocuments - quota.currentCount - 1, 0)
      : null,
  });
}
