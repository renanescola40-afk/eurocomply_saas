"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { DOCUMENT_BUCKET } from '@/lib/documents/upload';
import { getDocument } from '@/server/queries/documents';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5;

export async function createDocumentSignedDownloadUrl(documentId: string, organizationId: string) {
  const supabase = createAdminClient();
  const document = await getDocument(documentId, organizationId);

  if (!document?.storage_path) {
    throw new Error('Document not found');
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Unable to create signed download URL');
  }

  return {
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}
