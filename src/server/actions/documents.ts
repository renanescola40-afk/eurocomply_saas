import { z } from 'zod';
import {
  DOCUMENT_BUCKET,
  assertDocumentStoragePathInOrganization,
  validateDocumentFile,
} from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { createAuditEvent } from '@/server/queries/audit-events';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_AUDIT_EVENTS,
  buildTenantIsolatedUploadStoragePath,
  buildUploadSecurityMetadata,
  scanUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadPayload,
  type MalwareScanResult,
} from '@/server/security/upload-security';

const createDocumentSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80).default('general'),
  storagePath: z.string().min(2).max(500),
  mimeType: z.string().max(120).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const uploadDocumentSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80).default('general'),
  expiresAt: z.string().optional().nullable(),
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type UploadDocumentInput = z.input<typeof uploadDocumentSchema>;

function blockedScanError(scan: MalwareScanResult) {
  if (scan.status === 'infected' || scan.status === 'suspicious') {
    return new Error('Document upload was blocked because the scanner reported unsafe content.');
  }

  return new Error('Document upload was blocked because malware scanning did not return a clean result.');
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function metadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metadataBoolean(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'boolean' ? value : null;
}

function withoutRawStoragePath(metadata: Record<string, unknown> | undefined) {
  const safeMetadata = { ...(metadata ?? {}) };
  delete safeMetadata.storagePath;
  return safeMetadata;
}

async function auditUploadRejection(input: {
  organizationId: string;
  actorUserId: string;
  reason: string;
  file: File;
  fileHash?: string | null;
  scan?: MalwareScanResult | null;
  detectedMimeType?: string | null;
  declaredSignatureMatches?: boolean | null;
}) {
  const metadata = buildUploadSecurityMetadata({
    reason: input.reason,
    claimedMimeType: input.file.type,
    mimeDetected: input.detectedMimeType ?? null,
    fileSize: input.file.size,
    fileHash: input.fileHash ?? null,
    scan: input.scan ?? null,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    declaredSignatureMatches: input.declaredSignatureMatches ?? null,
  });

  await Promise.all([
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_AUDIT_EVENTS.uploadBlocked,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
    logAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'document.upload_rejected',
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
  ]);
}

export async function createDocument(input: CreateDocumentInput, userId: string) {
  const payload = createDocumentSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'documents:write');
  assertDocumentStoragePathInOrganization(payload.storagePath, payload.organizationId);

  const uploadSecurityMetadata = withoutRawStoragePath(payload.metadata);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: payload.organizationId,
      uploaded_by: userId,
      name: payload.name,
      category: payload.category,
      storage_path: payload.storagePath,
      mime_type: payload.mimeType ?? null,
      size_bytes: payload.sizeBytes ?? null,
      expires_at: payload.expiresAt ?? null,
      scan_status: metadataString(uploadSecurityMetadata, 'scanStatus'),
      scan_provider: metadataString(uploadSecurityMetadata, 'scanProvider'),
      scan_required: metadataBoolean(uploadSecurityMetadata, 'scanRequired'),
      scan_checked_at: metadataString(uploadSecurityMetadata, 'scanCheckedAt'),
      file_hash: metadataString(uploadSecurityMetadata, 'fileHash'),
      file_size: metadataNumber(uploadSecurityMetadata, 'fileSize') ?? payload.sizeBytes ?? null,
      mime_detected: metadataString(uploadSecurityMetadata, 'mimeDetected') ?? payload.mimeType ?? null,
      upload_security_metadata: uploadSecurityMetadata,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'document.created',
    entityType: 'document',
    entityId: data.id,
    metadata: {
      name: payload.name,
      category: payload.category,
      ...uploadSecurityMetadata,
      hasStoragePath: Boolean(payload.storagePath),
    },
  });

  return data;
}

export async function uploadDocument(input: UploadDocumentInput, file: File, userId: string) {
  const payload = uploadDocumentSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'documents:write');

  const context = { area: 'document_upload', organizationId: payload.organizationId, userId };
  const rateLimit = await checkDistributedRateLimit({
    key: `document_upload:${payload.organizationId}:${userId}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many document uploads. Please try again later.');
    reportError(error, context);
    throw error;
  }

  await createAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: UPLOAD_AUDIT_EVENTS.uploadRequested,
    entityType: 'document',
    entityId: payload.organizationId,
    metadata: buildUploadSecurityMetadata({
      reason: 'upload_requested',
      claimedMimeType: file.type,
      fileSize: file.size,
      organizationId: payload.organizationId,
      actorUserId: userId,
    }),
  });

  const validationError = validateDocumentFile(file);

  if (validationError) {
    await auditUploadRejection({ organizationId: payload.organizationId, actorUserId: userId, reason: 'metadata_validation_failed', file });
    const error = new Error(validationError);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const uploadValidation = await validateUploadPayload({ file, maxBytes: MAX_UPLOAD_BYTES });

  if (!uploadValidation.ok) {
    await auditUploadRejection({
      organizationId: payload.organizationId,
      actorUserId: userId,
      reason: uploadValidation.reason,
      file,
      fileHash: uploadValidation.fileHash ?? null,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    });
    const error = new Error(uploadValidation.message);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const scan = await scanUploadForMalware({
    buffer: uploadValidation.buffer,
    mimeType: uploadValidation.validation.mimeType,
    filename: uploadValidation.sanitizedFileName,
    organizationId: payload.organizationId,
    fileHash: uploadValidation.fileHash,
  });
  const scanMetadata = buildUploadSecurityMetadata({
    scan,
    fileHash: uploadValidation.fileHash,
    fileSize: file.size,
    mimeDetected: uploadValidation.mimeDetected,
    claimedMimeType: file.type,
    declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    organizationId: payload.organizationId,
    actorUserId: userId,
  });

  await createAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: UPLOAD_AUDIT_EVENTS.uploadScanned,
    entityType: 'document',
    entityId: payload.organizationId,
    metadata: scanMetadata,
  });

  if (shouldBlockUploadForMalwareScan(scan)) {
    await auditUploadRejection({
      organizationId: payload.organizationId,
      actorUserId: userId,
      reason: 'malware_scan_not_clean',
      file,
      fileHash: uploadValidation.fileHash,
      scan,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    });
    const error = blockedScanError(scan);
    reportError(error, { ...context, fileType: uploadValidation.validation.mimeType, fileSize: file.size, scanStatus: scan.status });
    throw error;
  }

  const supabase = createAdminClient();
  const storagePath = buildTenantIsolatedUploadStoragePath({
    organizationId: payload.organizationId,
    actorUserId: userId,
    extension: uploadValidation.validation.extension,
  });
  assertDocumentStoragePathInOrganization(storagePath, payload.organizationId);

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, uploadValidation.buffer, {
    contentType: uploadValidation.validation.mimeType,
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, { ...context, fileType: uploadValidation.validation.mimeType, fileSize: file.size });
    throw uploadError;
  }

  try {
    const auditMetadata = {
      ...scanMetadata,
      hasStoragePath: true,
      storagePathTenantPrefixValidated: true,
    };
    const document = await createDocument(
      {
        organizationId: payload.organizationId,
        name: payload.name,
        category: payload.category,
        storagePath,
        mimeType: uploadValidation.validation.mimeType,
        sizeBytes: file.size,
        expiresAt: payload.expiresAt ?? null,
        metadata: auditMetadata,
      },
      userId,
    );

    await createAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: userId,
      action: 'document_uploaded',
      entityType: 'document',
      entityId: document.id,
      metadata: {
        name: payload.name,
        category: payload.category,
        ...auditMetadata,
      },
    });

    return document;
  } catch (error) {
    reportError(error, { ...context, fileType: uploadValidation.validation.mimeType, fileSize: file.size });
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw error;
  }
}

export async function deleteDocument(documentId: string, organizationId: string, userId: string) {
  await assertCurrentUserCan(organizationId, userId, 'documents:delete');

  const context = { area: 'document_delete', organizationId, documentId, userId };
  const supabase = createAdminClient();

  const { data: document, error: findError } = await supabase
    .from('documents')
    .select('id,name,category,storage_path')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single();

  if (findError || !document) {
    reportError(findError ?? new Error('Document not found'), context);
    throw new Error('Document not found');
  }

  if (document.storage_path) {
    assertDocumentStoragePathInOrganization(document.storage_path, organizationId);

    const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storage_path]);

    if (storageError) {
      reportError(storageError, context);
      throw storageError;
    }
  }

  const { data: deletedDocument, error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .select('id,name,category')
    .single();

  if (deleteError) {
    reportError(deleteError, context);
    throw deleteError;
  }

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'document.deleted',
    entityType: 'document',
    entityId: documentId,
    metadata: { name: deletedDocument.name, category: deletedDocument.category },
  });

  return deletedDocument;
}
