import { createAdminClient } from '@/lib/supabase/admin';
import { assertPlanAtLeast } from '@/server/billing/entitlements';

export async function listComplianceTasks(organizationId: string) {
  const entitlement = await assertPlanAtLeast(organizationId, 'professional');
  if (!entitlement.ok) throw new Error('professional_plan_required');

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
