import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'crypto';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { assertDocumentStoragePathInOrganization, sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import {
  UPLOAD_MIME_TYPE_TO_EXTENSION,
  validateUploadFileSecurity,
  validateUploadFileSignature,
} from '@/server/security/file-signature';
import { scanUploadForMalware, shouldBlockUploadForMalwareScan, type MalwareScanResult } from '@/server/security/malware-scan';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const STORAGE_BUCKET = 'controlled-documents';

const ALLOWED_TYPES = UPLOAD_MIME_TYPE_TO_EXTENSION;
const SIGNATURE_MISMATCH_REASON = 'signature_mismatch';

function safeDocumentTitle(name: string) {
  return sanitizeDocumentDownloadFileName(name)
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
  declaredSignatureMatches?: boolean;
}) {
  return {
    reason: input.reason,
    claimedMimeType: input.file.type,
    detectedMimeType: input.detectedMimeType ?? null,
    sizeBytes: input.file.size,
    fileHash: input.fileHash ?? null,
    checksumSha256: input.fileHash ?? null,
    scanStatus: 'not_run',
    scanProvider: process.env.MALWARE_SCANNER_PROVIDER?.trim() || 'not_configured',
    scanRequired: process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS === 'true',
    scanCheckedAt: null,
    organizationId: null,
    actorUserId: null,
    actorRole: input.actorRole ?? 'unknown',
    declaredSignatureMatches: input.declaredSignatureMatches,
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

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: organization.id,
      metadata: {
        ...preScanAuditMetadata({ reason: 'invalid_size', file, actorRole: permission.role }),
        organizationId: organization.id,
        actorUserId: user.id,
      },
    });

    return noStoreJson({ error: 'File must be between 1 byte and 10 MB.' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  const declaredSignatureMatches = validateUploadFileSignature(file.type, buffer);
  const validation = validateUploadFileSecurity({
    fileName: file.name,
    claimedMimeType: file.type,
    sizeBytes: file.size,
    bytes: buffer,
    maxBytes: MAX_UPLOAD_BYTES,
  });

  if (!validation.ok) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: organization.id,
      metadata: {
        ...preScanAuditMetadata({
          reason: validation.reason === SIGNATURE_MISMATCH_REASON ? SIGNATURE_MISMATCH_REASON : validation.reason,
          file,
          actorRole: permission.role,
          fileHash,
          detectedMimeType: validation.detectedType?.mimeType ?? null,
          declaredSignatureMatches,
        }),
        organizationId: organization.id,
        actorUserId: user.id,
      },
    });

    return noStoreJson({ error: validation.message }, { status: validation.reason === 'file_too_large' ? 413 : 415 });
  }

  const extension = ALLOWED_TYPES.get(validation.mimeType);

  if (!extension) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: organization.id,
      metadata: {
        ...preScanAuditMetadata({ reason: 'unsupported_mime_type', file, actorRole: permission.role, fileHash, declaredSignatureMatches }),
        organizationId: organization.id,
        actorUserId: user.id,
      },
    });

    return noStoreJson({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.' }, { status: 415 });
  }

  const scan = await scanUploadForMalware({
    buffer,
    mimeType: validation.mimeType,
    filename: file.name,
    organizationId: organization.id,
    fileHash,
  });

  if (shouldBlockUploadForMalwareScan(scan)) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: organization.id,
      metadata: {
        reason: 'malware_scan_not_clean',
        scanStatus: scan.status,
        scanProvider: scan.provider,
        scanRequired: scan.required,
        scanCheckedAt: scan.scannedAt,
        scanReason: scan.reason,
        fileHash,
        checksumSha256: fileHash,
        mimeType: validation.mimeType,
        claimedMimeType: file.type,
        sizeBytes: file.size,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role ?? 'unknown',
      },
    });

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

  const storagePath = `${organization.id}/${user.id}/${randomUUID()}.${extension}`;
  assertDocumentStoragePathInOrganization(storagePath, organization.id);

  const title = safeDocumentTitle(file.name);
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return noStoreJson({ error: 'Secure document storage is not configured.' }, { status: 503 });
  }

  const storage = supabase.storage.from(STORAGE_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, buffer, {
    contentType: validation.mimeType,
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
      checksum_sha256: fileHash,
      mime_type: validation.mimeType,
      size_bytes: file.size,
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
      mimeType: validation.mimeType,
      claimedMimeType: file.type,
      sizeBytes: file.size,
      fileHash,
      checksumSha256: fileHash,
      plan: quota.entitlements.plan,
      actorRole: permission.role ?? 'unknown',
      documentCountBeforeUpload: quota.currentCount,
      scanStatus: scan.status,
      scanProvider: scan.provider,
      scanRequired: scan.required,
      scanCheckedAt: scan.scannedAt,
      organizationId: organization.id,
      actorUserId: user.id,
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
    checksum: fileHash,
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
