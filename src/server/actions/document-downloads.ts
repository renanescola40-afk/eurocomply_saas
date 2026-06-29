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
const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type DocumentUrlAccessPurpose = 'download' | 'preview';

function normalizeDocumentId(documentId: string) {
  const normalized = String(documentId ?? '').trim();
  if (!DOCUMENT_ID_PATTERN.test(normalized)) {
    throw new Error('Document not found');
  }

  return normalized;
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

async function enforceSignedUrlRateLimit(input: {
  userId: string;
  organizationIds: string[];
  accessPurpose: DocumentUrlAccessPurpose;
}) {
  const rateLimit = await checkDistributedRateLimit({
    key: `documents:signed-url:${input.accessPurpose}:${input.organizationIds.join(',')}:${input.userId}`,
    policy: 'export',
    userId: input.userId,
    organizationId: input.organizationIds[0] ?? null,
    route: 'server-action:createDocumentSignedUrl',
    action: `document_signed_${input.accessPurpose}_url`,
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw new Error('Too many document access requests. Please try again later.');
  }
}

async function createDocumentSignedUrl(documentId: string, accessPurpose: DocumentUrlAccessPurpose) {
  const user = await requireCurrentUser();
  const safeDocumentId = (() => {
    try {
      return normalizeDocumentId(documentId);
    } catch (error) {
      void auditRejectedDownloadUrl({
        documentId: 'invalid_document_id',
        userId: user.id,
        reason: 'invalid_document_id',
        accessPurpose,
      }).catch(() => null);
      throw error;
    }
  })();
  const memberships = await getUserOrganizationMemberships(user.id);
  const organizationIds = memberships.map((membership) => membership.organization_id).sort();
  const context = { area: 'document_signed_download_url', documentId: safeDocumentId, userId: user.id, accessPurpose };

  await auditDownloadRequested({
    documentId: safeDocumentId,
    userId: user.id,
    organizationId: organizationIds[0] ?? null,
    membershipCount: organizationIds.length,
    accessPurpose,
  });

  if (organizationIds.length === 0) {
    await auditRejectedDownloadUrl({
      documentId: safeDocumentId,
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
    .eq('id', safeDocumentId)
    .in('organization_id', organizationIds)
    .maybeSingle();

  if (documentError || !document?.storage_path) {
    reportError(documentError ?? new Error('Document not found'), context);
    await auditRejectedDownloadUrl({
      documentId: safeDocumentId,
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
      documentId: safeDocumentId,
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
      documentId: safeDocumentId,
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
      documentId: safeDocumentId,
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
    entityId: safeDocumentId,
    metadata: buildUploadSecurityAuditMetadata({
      organizationId: document.organization_id,
      actorUserId: user.id,
      documentId: safeDocumentId,
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
