'use server';

import { DOCUMENT_BUCKET } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5;

export async function createDocumentSignedDownloadUrl(documentId: string) {
  const user = await requireCurrentUser();
  const memberships = await getUserOrganizationMemberships(user.id);
  const organizationIds = memberships.map((membership) => membership.organization_id);
  const context = { area: 'document_signed_download_url', documentId, userId: user.id };

  if (organizationIds.length === 0) {
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
    throw new Error('Document not found');
  }

  await assertCurrentUserCan(document.organization_id, user.id, 'documents:read');

  if (!document.storage_path.startsWith(`${document.organization_id}/`)) {
    const error = new Error('Document storage path does not match organization scope');
    reportError(error, { ...context, organizationId: document.organization_id });
    throw error;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS, {
      download: document.name ?? true,
    });

  if (error || !data?.signedUrl) {
    reportError(error ?? new Error('Unable to create signed download URL'), {
      ...context,
      organizationId: document.organization_id,
    });
    throw new Error('Unable to create signed download URL');
  }

  await logAuditEvent({
    organizationId: document.organization_id,
    actorUserId: user.id,
    action: 'document.download_url_created',
    entityType: 'document',
    entityId: documentId,
    metadata: { expiresInSeconds: SIGNED_URL_EXPIRES_IN_SECONDS },
  });

  return {
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}
