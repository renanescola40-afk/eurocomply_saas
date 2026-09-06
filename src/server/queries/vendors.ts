import { createAdminClient } from '@/lib/supabase/admin';
import { assertPlanAtLeast } from '@/server/billing/entitlements';

const VENDOR_COLUMNS = 'id,name,website,country,category,risk_level,review_status,created_at,updated_at';

export async function listVendors(organizationId: string) {
  const entitlement = await assertPlanAtLeast(organizationId, 'professional');
  if (!entitlement.ok) throw new Error('professional_plan_required');

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[vendors] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load vendor register.');
  }

  return data ?? [];
}
