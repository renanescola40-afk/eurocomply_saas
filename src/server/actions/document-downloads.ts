'use server';

import { DOCUMENT_BUCKET } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5;

export async function createDocumentSignedDownloadUrl(documentId: string, organizationId: string, userId: string) {
  const context = { area: 'document_signed_download_url', organizationId, documentId, userId };

  await assertCurrentUserCan(organizationId, userId, 'documents:read');

  const supabase = createAdminClient();
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id,name,storage_path,organization_id')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single();

  if (documentError || !document?.storage_path) {
    reportError(documentError ?? new Error('Document not found'), context);
    throw new Error('Document not found');
  }

  if (!document.storage_path.startsWith(`${organizationId}/`)) {
    const error = new Error('Document storage path does not match organization scope');
    reportError(error, { ...context, storagePath: document.storage_path });
    throw error;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS, {
      download: document.name ?? true,
    });

  if (error || !data?.signedUrl) {
    reportError(error ?? new Error('Unable to create signed download URL'), context);
    throw new Error(error?.message ?? 'Unable to create signed download URL');
  }

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
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
