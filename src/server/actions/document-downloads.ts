'use server';

import { DOCUMENT_BUCKET, assertDocumentStoragePathInOrganization, sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60;
const SECURITY_FAILURE_AUDIT_ACTION = 'security.failure';

async function auditRejectedDownloadUrl(input: {
  documentId: string;
  userId: string;
  reason: string;
  organizationId?: string | null;
  storagePath?: string | null;
  membershipCount?: number;
}) {
  await logAuditEvent({
    organizationId: input.organizationId ?? null,
    actorUserId: input.userId,
    action: SECURITY_FAILURE_AUDIT_ACTION,
    entityType: 'document',
    entityId: input.documentId,
    metadata: {
      action: 'document.download',
      reason: input.reason,
      organizationId: input.organizationId ?? null,
      actorUserId: input.userId,
      documentId: input.documentId,
      hasStoragePath: Boolean(input.storagePath),
      membershipCount: input.membershipCount ?? null,
    },
  });
}

export async function createDocumentSignedDownloadUrl(documentId: string) {
  const user = await requireCurrentUser();
  const memberships = await getUserOrganizationMemberships(user.id);
  const organizationIds = memberships.map((membership) => membership.organization_id);
  const context = { area: 'document_signed_download_url', documentId, userId: user.id };

  if (organizationIds.length === 0) {
    await auditRejectedDownloadUrl({
      documentId,
      userId: user.id,
      reason: 'no_organization_access',
      membershipCount: 0,
    });
    throw new Error('Organization access required');
  }

  const supabase = createAdminClient();
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id,name,storage_path,organization_id')
    .eq('id', documentId)
    .in('organization_id', organizationIds)
    .maybeSingle();

  if (documentError || !document?.storage_path) {
    reportError(documentError ?? new Error('Document not found'), context);
    await auditRejectedDownloadUrl({
      documentId,
      userId: user.id,
      reason: 'document_not_found_or_cross_tenant',
      organizationId: organizationIds[0] ?? null,
      membershipCount: organizationIds.length,
    });
    throw new Error('Document not found');
  }

  try {
    await assertCurrentUserCan(document.organization_id, user.id, 'documents:read');
  } catch (error) {
    reportError(error, { ...context, organizationId: document.organization_id });
    await auditRejectedDownloadUrl({
      documentId,
      userId: user.id,
      reason: 'permission_denied',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
    });
    throw error;
  }

  try {
    assertDocumentStoragePathInOrganization(document.storage_path, document.organization_id);
  } catch (error) {
    reportError(error, { ...context, organizationId: document.organization_id, storagePath: document.storage_path });
    await auditRejectedDownloadUrl({
      documentId,
      userId: user.id,
      reason: 'invalid_storage_path',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
    });
    throw error;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS, {
      download: sanitizeDocumentDownloadFileName(document.name),
    });

  if (error || !data?.signedUrl) {
    reportError(error ?? new Error('Unable to create signed download URL'), {
      ...context,
      organizationId: document.organization_id,
    });
    await auditRejectedDownloadUrl({
      documentId,
      userId: user.id,
      reason: 'signed_url_create_failed',
      organizationId: document.organization_id,
      storagePath: document.storage_path,
      membershipCount: organizationIds.length,
    });
    throw new Error('Unable to create signed download URL');
  }

  await logAuditEvent({
    organizationId: document.organization_id,
    actorUserId: user.id,
    action: 'document.download',
    entityType: 'document',
    entityId: documentId,
    metadata: {
      expiresInSeconds: SIGNED_URL_EXPIRES_IN_SECONDS,
      organizationId: document.organization_id,
      actorUserId: user.id,
    },
  });

  return {
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}
