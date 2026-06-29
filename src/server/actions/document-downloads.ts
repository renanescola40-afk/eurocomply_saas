'use server';

import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';
import {
  CONTROLLED_DOCUMENT_STORAGE_BUCKET as DOCUMENT_BUCKET,
  SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS,
  UPLOAD_SECURITY_AUDIT_EVENTS,
  assertTenantStoragePathInOrganization,
  buildUploadSecurityAuditMetadata,
} from '@/server/security/upload-security';

const SIGNED_URL_EXPIRES_IN_SECONDS = SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS;
const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_SIGNED_URL_RATE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
} as const;

type DocumentUrlAccessPurpose = 'download' | 'preview';

function isValidDocumentId(documentId: string) {
  return DOCUMENT_ID_PATTERN.test(documentId.trim());
}

async function auditDownloadRequested(input: {
  documentId: string;
  userId: string;
  organizationId?: string | null;
  membershipCount?: number;
  accessPurpose: DocumentUrlAccessPurpose;
}) {
  await logAuditEvent({
    organizationId: input.organizationId ?? null,
    actorUserId: input.userId,
    action: UPLOAD_SECURITY_AUDIT_EVENTS.downloadRequested,
    entityType: 'document',
    entityId: input.documentId,
    metadata: buildUploadSecurityAuditMetadata({
      organizationId: input.organizationId ?? null,
      actorUserId: input.userId,
      documentId: input.documentId,
      accessPurpose: input.accessPurpose,
      expiresInSeconds: SIGNED_URL_EXPIRES_IN_SECONDS,
    }),
  });
}

async function auditRejectedDownloadUrl(input: {
  documentId: string;
  userId: string;
  reason: string;
  organizationId?: string | null;
  storagePath?: string | null;
  membershipCount?: number;
  accessPurpose: DocumentUrlAccessPurpose;
}) {
  const metadata = {
    ...buildUploadSecurityAuditMetadata({
      reason: input.reason,
      organizationId: input.organizationId ?? null,
      actorUserId: input.userId,
      documentId: input.documentId,
      accessPurpose: input.accessPurpose,
      expiresInSeconds: SIGNED_URL_EXPIRES_IN_SECONDS,
    }),
    hasStoragePath: Boolean(input.storagePath),
    membershipCount: input.membershipCount ?? null,
  };

  await Promise.all([
    logAuditEvent({
      organizationId: input.organizationId ?? null,
      actorUserId: input.userId,
      action: UPLOAD_SECURITY_AUDIT_EVENTS.downloadDenied,
      entityType: 'document',
      entityId: input.documentId,
      metadata,
    }),
    logAuditEvent({
      organizationId: input.organizationId ?? null,
      actorUserId: input.userId,
      action: 'document.download_url_rejected',
      entityType: 'document',
      entityId: input.documentId,
      metadata,
    }),
  ]);
}

async function enforceDocumentUrlRateLimit(input: {
  documentId: string;
  userId: string;
  accessPurpose: DocumentUrlAccessPurpose;
}) {
  const rateLimit = await checkDistributedRateLimit({
    key: `documents:signed-url:${input.accessPurpose}:${input.userId}:${input.documentId}`,
    policy: 'export',
    userId: input.userId,
    action: `document_${input.accessPurpose}_signed_url`,
    route: 'server-action:document-downloads',
    ...DOCUMENT_SIGNED_URL_RATE_LIMIT,
  });

  if (!rateLimit.allowed) {
    await auditRejectedDownloadUrl({
      documentId: input.documentId,
      userId: input.userId,
      reason: 'rate_limited',
      accessPurpose: input.accessPurpose,
    });
    throw new Error('Too many document download requests. Please try again later.');
  }
}

async function createDocumentSignedUrl(documentId: string, accessPurpose: DocumentUrlAccessPurpose) {
  const user = await requireCurrentUser();
  const normalizedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
  const context = { area: 'document_signed_download_url', documentId: normalizedDocumentId, userId: user.id, accessPurpose };

  await auditDownloadRequested({
    documentId: normalizedDocumentId || 'invalid_document_id',
    userId: user.id,
    accessPurpose,
  });

  if (!isValidDocumentId(normalizedDocumentId)) {
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId || 'invalid_document_id',
      userId: user.id,
      reason: 'invalid_document_id',
      accessPurpose,
    });
    throw new Error('Document not found');
  }

  await enforceDocumentUrlRateLimit({ documentId: normalizedDocumentId, userId: user.id, accessPurpose });

  const memberships = await getUserOrganizationMemberships(user.id);
  const organizationIds = memberships.map((membership) => membership.organization_id);

  if (organizationIds.length === 0) {
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId,
      userId: user.id,
      reason: 'no_organization_access',
      membershipCount: 0,
      accessPurpose,
    });
    throw new Error('Organization access required');
  }

  await enforceSignedUrlRateLimit({
    userId: user.id,
    organizationIds,
    accessPurpose,
  });

  const supabase = createAdminClient();
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id,name,storage_path,organization_id')
    .eq('id', normalizedDocumentId)
    .in('organization_id', organizationIds)
    .maybeSingle();

  if (documentError || !document?.storage_path) {
    reportError(documentError ?? new Error('Document not found'), context);
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId,
      userId: user.id,
      reason: 'document_not_found_or_cross_tenant',
      organizationId: organizationIds[0] ?? null,
      membershipCount: organizationIds.length,
      accessPurpose,
    });
    throw new Error('Document not found');
  }

  try {
    await assertCurrentUserCan(document.organization_id, user.id, 'documents:read');
  } catch (error) {
    reportError(error, { ...context, organizationId: document.organization_id });
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId,
      userId: user.id,
      reason: 'permission_denied',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
      accessPurpose,
    });
    throw error;
  }

  try {
    assertTenantStoragePathInOrganization(document.storage_path, document.organization_id);
  } catch (error) {
    reportError(error, { ...context, organizationId: document.organization_id, hasStoragePath: Boolean(document.storage_path) });
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId,
      userId: user.id,
      reason: 'invalid_storage_path',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
      accessPurpose,
    });
    throw error;
  }

  const signedUrlOptions = accessPurpose === 'download'
    ? { download: sanitizeDocumentDownloadFileName(document.name) }
    : undefined;
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS, signedUrlOptions);

  if (error || !data?.signedUrl) {
    reportError(error ?? new Error('Unable to create signed download URL'), {
      ...context,
      organizationId: document.organization_id,
    });
    await auditRejectedDownloadUrl({
      documentId: normalizedDocumentId,
      userId: user.id,
      reason: 'signed_url_create_failed',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
      accessPurpose,
    });
    throw new Error('Unable to create signed download URL');
  }

  await logAuditEvent({
    organizationId: document.organization_id,
    actorUserId: user.id,
    action: 'document.download_url_created',
    entityType: 'document',
    entityId: normalizedDocumentId,
    metadata: buildUploadSecurityAuditMetadata({
      organizationId: document.organization_id,
      actorUserId: user.id,
      documentId: normalizedDocumentId,
      accessPurpose,
      expiresInSeconds: SIGNED_URL_EXPIRES_IN_SECONDS,
    }),
  });

  return {
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}

export async function createDocumentSignedDownloadUrl(documentId: string) {
  return createDocumentSignedUrl(documentId, 'download');
}

export async function createDocumentSignedPreviewUrl(documentId: string) {
  return createDocumentSignedUrl(documentId, 'preview');
}
