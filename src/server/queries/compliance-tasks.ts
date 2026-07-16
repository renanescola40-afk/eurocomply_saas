import { createAdminClient } from '@/lib/supabase/admin';

export async function listComplianceTasks(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true });

  if (error) {
    console.warn('[tasks] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load compliance tasks.');
  }

  return data ?? [];
}
