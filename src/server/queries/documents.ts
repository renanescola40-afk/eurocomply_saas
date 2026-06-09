import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';

const DOCUMENT_COLUMNS = 'id,organization_id,title,status,version,expires_at,created_at,updated_at';

export async function listDocuments(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[documents] list_failed', { code: error.code });
    return [];
  }

  return data ?? [];
}

export async function getDocument(documentId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_COLUMNS)
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.warn('[documents] get_failed', { code: error.code });
    throw error;
  }

  return data;
}
