import { createAdminClient } from '@/lib/supabase/admin';

export async function listRisks(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('risk_score', { ascending: false });

  if (error) {
    console.warn('[risks] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load risk register.');
  }

  return data ?? [];
}
