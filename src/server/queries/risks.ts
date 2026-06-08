import { createAdminClient } from '@/lib/supabase/admin';

export async function listRisks(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('risk_score', { ascending: false });

  if (error) {
    console.warn('[risks] Failed to list risks:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getRisk(riskId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('id', riskId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
