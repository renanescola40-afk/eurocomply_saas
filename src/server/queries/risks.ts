import { createAdminClient } from '@/lib/supabase/admin';
import { assertPlanAtLeast } from '@/server/billing/entitlements';

export async function listRisks(organizationId: string) {
  const entitlement = await assertPlanAtLeast(organizationId, 'professional');
  if (!entitlement.ok) throw new Error('professional_plan_required');

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
