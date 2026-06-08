import { createAdminClient } from '@/lib/supabase/admin';

export async function listDocuments(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[documents] Failed to list documents:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getDocument(documentId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single();

  if (error) throw error;

  return data;
}
