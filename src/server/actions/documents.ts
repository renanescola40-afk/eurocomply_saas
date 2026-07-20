import { z } from 'zod';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { createAuditEvent } from '@/server/queries/audit-events';
import { requireCurrentUser } from '@/server/queries/auth';
import {
  CONTROLLED_DOCUMENT_STORAGE_BUCKET as DOCUMENT_BUCKET,
  MAX_UPLOAD_BYTES,
  UPLOAD_SECURITY_AUDIT_EVENTS,
  assertTenantStoragePathInOrganization,
  buildTenantScopedUploadPath,
  buildUploadSecurityAuditMetadata,
  currentUploadMalwareScannerProvider,
  isUploadMalwareScanRequired,
  scanValidatedUploadForMalware,
  shouldBlockUploadForMalwareScan,
  validateUploadSecurityFile,
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

type DocumentSecurityProvenance = 'untrusted_metadata' | 'validated_upload' | 'server_generated';
type DocumentMutationAction = 'create' | 'template' | 'upload';

const DOCUMENT_MUTATION_COLUMNS =
  'id,organization_id,uploaded_by,name,category,status,storage_path,mime_type,size_bytes,expires_at,created_at,updated_at,scan_status,scan_provider,scan_required,scan_checked_at,file_hash,file_size,mime_detected' as const;

function actionError(message: string) {
  return new Error(message);
}

export async function enforceDocumentMutationRateLimit(input: {
  action: DocumentMutationAction;
  organizationId: string;
  userId: string;
}) {
  const rateLimit = await checkDistributedRateLimit({
    key: `documents:${input.action}:${input.organizationId}:${input.userId}`,
    policy: 'upload',
    userId: input.userId,
    organizationId: input.organizationId,
    route: `server-action:${input.action}Document`,
    action: `document.${input.action}`,
    limit: input.action === 'create' ? 20 : 10,
    windowMs: 60 * 1000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many document requests. Please try again later.');
  }
}

export async function enforceDocumentQuota(organizationId: string) {
  const quota = await assertDocumentQuota(organizationId);

  if (!quota.ok) {
    throw actionError(quota.message);
  }
}

function blockedScanError(scan: MalwareScanResult) {
  if (scan.status === 'infected' || scan.status === 'suspicious') {
    return actionError('Document upload was blocked because the scanner reported unsafe content.');
  }

  return actionError('Document upload was blocked because malware scanning did not return a clean result.');
}

function uploadSecurityColumns(metadata: Record<string, unknown> | undefined, fallbackMimeType: string | null, fallbackSizeBytes: number | null) {
  return {
    scan_status: typeof metadata?.scanStatus === 'string' ? metadata.scanStatus : null,
    scan_provider: typeof metadata?.scanProvider === 'string' ? metadata.scanProvider : null,
    scan_required: typeof metadata?.scanRequired === 'boolean' ? metadata.scanRequired : null,
    scan_checked_at: typeof metadata?.scanCheckedAt === 'string' ? metadata.scanCheckedAt : null,
    file_hash: typeof metadata?.fileHash === 'string' ? metadata.fileHash : null,
    file_size: typeof metadata?.fileSize === 'number' ? metadata.fileSize : fallbackSizeBytes,
    mime_detected: typeof metadata?.mimeDetected === 'string' ? metadata.mimeDetected : fallbackMimeType,
  };
}

function withoutRawStoragePath(metadata: Record<string, unknown> | undefined) {
  const safeMetadata = { ...(metadata ?? {}) };
  delete safeMetadata.storagePath;
  return safeMetadata;
}

function stringMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function assertEnterpriseDocumentCreateHasTrustedProvenance(input: {
  organizationId: string;
  actorUserId: string;
  metadata: Record<string, unknown> | undefined;
  provenance: DocumentSecurityProvenance;
}) {
  if (!isUploadMalwareScanRequired()) return;
  if (input.provenance === 'validated_upload' || input.provenance === 'server_generated') return;

  const metadata = {
    ...buildUploadSecurityAuditMetadata({
      reason: 'enterprise_upload_scan_bypass',
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      accessPurpose: 'upload',
      fileHash: stringMetadataValue(input.metadata, 'fileHash'),
      fileSize: numberMetadataValue(input.metadata, 'fileSize'),
      mimeDetected: stringMetadataValue(input.metadata, 'mimeDetected'),
    }),
    attemptedScanStatus: stringMetadataValue(input.metadata, 'scanStatus') ?? 'missing',
    attemptedScanProvider: stringMetadataValue(input.metadata, 'scanProvider'),
    attemptedServerGenerated: input.metadata?.serverGenerated === true,
    expectedScanStatus: 'clean',
    expectedScanProvider: currentUploadMalwareScannerProvider(),
    provenance: input.provenance,
  };

  await Promise.all([
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
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
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
  ]);

  throw actionError('Document upload was blocked because enterprise upload scanning provenance is not trusted.');
}

async function auditUploadRequested(input: { organizationId: string; actorUserId: string; file: File }) {
  const metadata = buildUploadSecurityAuditMetadata({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    claimedMimeType: input.file.type,
    fileSize: input.file.size,
    accessPurpose: 'upload',
  });

  await Promise.all([
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadRequested,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
    logAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadRequested,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
  ]);
}

async function auditUploadScanned(input: {
  organizationId: string;
  actorUserId: string;
  scan: MalwareScanResult;
  fileHash: string;
  fileSize: number;
  claimedMimeType: string;
  mimeDetected: string;
  declaredSignatureMatches: boolean;
}) {
  const metadata = buildUploadSecurityAuditMetadata({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    scan: input.scan,
    fileHash: input.fileHash,
    fileSize: input.fileSize,
    claimedMimeType: input.claimedMimeType,
    mimeDetected: input.mimeDetected,
    declaredSignatureMatches: input.declaredSignatureMatches,
    accessPurpose: 'upload',
  });

  await Promise.all([
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadScanned,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
    logAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadScanned,
      entityType: 'document',
      entityId: input.organizationId,
      metadata,
    }),
  ]);
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
  const metadata = {
    ...buildUploadSecurityAuditMetadata({
      reason: input.reason,
      claimedMimeType: input.file.type,
      mimeDetected: input.detectedMimeType ?? null,
      fileSize: input.file.size,
      fileHash: input.fileHash ?? null,
      scan: input.scan ?? null,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      declaredSignatureMatches: input.declaredSignatureMatches ?? null,
      accessPurpose: 'upload',
    }),
    scanReason: input.scan?.reason ?? null,
  };

  await Promise.all([
    createAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
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
      action: UPLOAD_SECURITY_AUDIT_EVENTS.uploadBlocked,
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

async function createDocumentForUser(
  input: CreateDocumentInput,
  userId: string,
  provenance: DocumentSecurityProvenance,
  verified: { quota: boolean; rateLimit: boolean } = { quota: false, rateLimit: false },
) {
  const payload = createDocumentSchema.parse(input);
  const context = { area: 'document_create', organizationId: payload.organizationId, userId };
  await assertCurrentUserCan(payload.organizationId, userId, 'documents:write');
  if (!verified.rateLimit) {
    await enforceDocumentMutationRateLimit({
      action: 'create',
      organizationId: payload.organizationId,
      userId,
    });
  }
  if (!verified.quota) {
    await enforceDocumentQuota(payload.organizationId);
  }
  assertTenantStoragePathInOrganization(payload.storagePath, payload.organizationId);

  const uploadSecurityMetadata = withoutRawStoragePath(payload.metadata);
  await assertEnterpriseDocumentCreateHasTrustedProvenance({
    organizationId: payload.organizationId,
    actorUserId: userId,
    metadata: uploadSecurityMetadata,
    provenance,
  });

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
      ...uploadSecurityColumns(uploadSecurityMetadata, payload.mimeType ?? null, payload.sizeBytes ?? null),
    })
    .select(DOCUMENT_MUTATION_COLUMNS)
    .single();

  if (error) {
    reportError(error, context);
    throw actionError('Unable to create document.');
  }

  let auditPersisted = false;

  try {
    const audit = await logAuditEvent({
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
    auditPersisted = audit.persisted;
  } catch (auditError) {
    reportError(auditError, { ...context, area: 'document_create_audit' });
  }

  if (!auditPersisted) {
    const { error: rollbackError } = await supabase
      .from('documents')
      .delete()
      .eq('id', data.id)
      .eq('organization_id', payload.organizationId)
      .eq('uploaded_by', userId)
      .eq('storage_path', payload.storagePath);

    if (rollbackError) {
      reportError(rollbackError, {
        ...context,
        area: 'document_create_audit_rollback',
        documentId: data.id,
      });
    }

    throw actionError('Unable to create document.');
  }

  return data;
}

export async function createDocument(input: CreateDocumentInput) {
  const user = await requireCurrentUser();
  return createDocumentForUser(input, user.id, 'untrusted_metadata');
}

export async function createServerGeneratedDocument(input: CreateDocumentInput) {
  const user = await requireCurrentUser();
  return createDocumentForUser(input, user.id, 'server_generated');
}

export async function uploadDocument(input: UploadDocumentInput, file: File) {
  const user = await requireCurrentUser();
  const userId = user.id;
  const payload = uploadDocumentSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'documents:write');

  const context = { area: 'document_upload', organizationId: payload.organizationId, userId };
  await enforceDocumentMutationRateLimit({
    action: 'upload',
    organizationId: payload.organizationId,
    userId,
  });
  await enforceDocumentQuota(payload.organizationId);

  await auditUploadRequested({ organizationId: payload.organizationId, actorUserId: userId, file });
  const uploadValidation = await validateUploadSecurityFile(file, { maxBytes: MAX_UPLOAD_BYTES });

  if (!uploadValidation.ok) {
    await auditUploadRejection({
      organizationId: payload.organizationId,
      actorUserId: userId,
      reason: uploadValidation.reason,
      file,
      fileHash: uploadValidation.fileHash,
      detectedMimeType: uploadValidation.mimeDetected,
      declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
    });
    const error = actionError(uploadValidation.message);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const scan = await scanValidatedUploadForMalware({
    validation: uploadValidation,
    organizationId: payload.organizationId,
  });

  await auditUploadScanned({
    organizationId: payload.organizationId,
    actorUserId: userId,
    scan,
    fileHash: uploadValidation.fileHash,
    fileSize: uploadValidation.fileSize,
    claimedMimeType: uploadValidation.claimedMimeType,
    mimeDetected: uploadValidation.mimeDetected,
    declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
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
    reportError(error, { ...context, fileType: uploadValidation.mimeDetected, fileSize: uploadValidation.fileSize, scanStatus: scan.status });
    throw error;
  }

  const supabase = createAdminClient();
  const storagePath = buildTenantScopedUploadPath({
    organizationId: payload.organizationId,
    userId,
    extension: uploadValidation.extension,
  });

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, uploadValidation.buffer, {
    contentType: uploadValidation.mimeDetected,
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, { ...context, fileType: uploadValidation.mimeDetected, fileSize: uploadValidation.fileSize });
    throw actionError('Unable to upload document.');
  }

  try {
    const auditMetadata = {
      ...buildUploadSecurityAuditMetadata({
        scan,
        fileHash: uploadValidation.fileHash,
        fileSize: uploadValidation.fileSize,
        claimedMimeType: uploadValidation.claimedMimeType,
        mimeDetected: uploadValidation.mimeDetected,
        organizationId: payload.organizationId,
        actorUserId: userId,
        declaredSignatureMatches: uploadValidation.declaredSignatureMatches,
        accessPurpose: 'upload',
      }),
      mimeType: uploadValidation.mimeDetected,
      hasStoragePath: true,
      storagePathTenantPrefixValidated: true,
    };
    const document = await createDocumentForUser({
      organizationId: payload.organizationId,
      name: payload.name,
      category: payload.category,
      storagePath,
      mimeType: uploadValidation.mimeDetected,
      sizeBytes: uploadValidation.fileSize,
      expiresAt: payload.expiresAt ?? null,
      metadata: auditMetadata,
    }, userId, 'validated_upload', { quota: true, rateLimit: true });

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
    reportError(error, { ...context, fileType: uploadValidation.mimeDetected, fileSize: uploadValidation.fileSize });
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw actionError('Unable to upload document.');
  }
}

export async function deleteDocument(documentId: string, organizationId: string) {
  const user = await requireCurrentUser();
  const userId = user.id;
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
    reportError(findError ?? actionError('Document not found'), context);
    throw actionError('Document not found');
  }

  if (document.storage_path) {
    assertTenantStoragePathInOrganization(document.storage_path, organizationId);
    const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storage_path]);

    if (storageError) {
      reportError(storageError, context);
      throw actionError('Unable to delete document.');
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
    throw actionError('Unable to delete document.');
  }

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'document.deleted',
    entityType: 'document',
    entityId: documentId,
    metadata: { category: deletedDocument.category },
  });

  return deletedDocument;
}
