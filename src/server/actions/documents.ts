import { createHash } from 'crypto';
import { z } from 'zod';
import {
  DOCUMENT_BUCKET,
  assertDocumentStoragePathInOrganization,
  buildDocumentStoragePath,
  validateDocumentFile,
} from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { createAuditEvent } from '@/server/queries/audit-events';
import { validateUploadFileSecurity, validateUploadFileSignature } from '@/server/security/file-signature';
import { scanUploadForMalware, shouldBlockUploadForMalwareScan, type MalwareScanResult } from '@/server/security/malware-scan';

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

async function auditUploadRejection(input: {
  organizationId: string;
  actorUserId: string;
  reason: string;
  file: File;
  fileHash?: string | null;
  scan?: MalwareScanResult | null;
  detectedMimeType?: string | null;
  declaredSignatureMatches?: boolean;
}) {
  const scan = input.scan;
  const metadata = {
    reason: input.reason,
    claimedMimeType: input.file.type,
    detectedMimeType: input.detectedMimeType ?? null,
    sizeBytes: input.file.size,
    fileHash: input.fileHash ?? null,
    checksumSha256: input.fileHash ?? null,
    scanStatus: scan?.status ?? 'not_run',
    scanProvider: scan?.provider ?? process.env.MALWARE_SCANNER_PROVIDER?.trim() ?? 'not_configured',
    scanRequired: scan?.required ?? process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS === 'true',
    scanCheckedAt: scan?.scannedAt ?? null,
    scanReason: scan?.reason ?? null,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    declaredSignatureMatches: input.declaredSignatureMatches,
  };

  await Promise.all([
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
    metadata: { name: payload.name, category: payload.category, ...(payload.metadata ?? {}) },
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

  const validationError = validateDocumentFile(file);

  if (validationError) {
    await auditUploadRejection({ organizationId: payload.organizationId, actorUserId: userId, reason: 'metadata_validation_failed', file });
    const error = new Error(validationError);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  const declaredSignatureMatches = validateUploadFileSignature(file.type, buffer);
  const contentValidation = validateUploadFileSecurity({
    fileName: file.name,
    claimedMimeType: file.type,
    sizeBytes: file.size,
    bytes: buffer,
    maxBytes: 10 * 1024 * 1024,
  });

  if (!contentValidation.ok) {
    await auditUploadRejection({
      organizationId: payload.organizationId,
      actorUserId: userId,
      reason: contentValidation.reason,
      file,
      fileHash,
      detectedMimeType: contentValidation.detectedType?.mimeType ?? null,
      declaredSignatureMatches,
    });
    const error = new Error(contentValidation.message);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const scan = await scanUploadForMalware({
    buffer,
    mimeType: contentValidation.mimeType,
    filename: file.name,
    organizationId: payload.organizationId,
    fileHash,
  });

  if (shouldBlockUploadForMalwareScan(scan)) {
    await auditUploadRejection({
      organizationId: payload.organizationId,
      actorUserId: userId,
      reason: 'malware_scan_not_clean',
      file,
      fileHash,
      scan,
      detectedMimeType: contentValidation.mimeType,
      declaredSignatureMatches,
    });
    const error = blockedScanError(scan);
    reportError(error, { ...context, fileType: contentValidation.mimeType, fileSize: file.size, scanStatus: scan.status });
    throw error;
  }

  const supabase = createAdminClient();
  const storagePath = buildDocumentStoragePath({
    organizationId: payload.organizationId,
    userId,
    fileName: file.name,
  });
  assertDocumentStoragePathInOrganization(storagePath, payload.organizationId);

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, buffer, {
    contentType: contentValidation.mimeType,
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, { ...context, fileType: contentValidation.mimeType, fileSize: file.size });
    throw uploadError;
  }

  try {
    return await createDocument(
      {
        organizationId: payload.organizationId,
        name: payload.name,
        category: payload.category,
        storagePath,
        mimeType: contentValidation.mimeType,
        sizeBytes: file.size,
        expiresAt: payload.expiresAt ?? null,
        metadata: {
          fileHash,
          checksumSha256: fileHash,
          claimedMimeType: file.type,
          scanStatus: scan.status,
          scanProvider: scan.provider,
          scanRequired: scan.required,
          scanCheckedAt: scan.scannedAt,
          organizationId: payload.organizationId,
          actorUserId: userId,
        },
      },
      userId,
    );
  } catch (error) {
    reportError(error, { ...context, fileType: contentValidation.mimeType, fileSize: file.size });
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

  assertDocumentStoragePathInOrganization(document.storage_path, organizationId);

  if (document.storage_path) {
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
