import { getBillingAddOn, isBillingAddOnCommerciallyActive } from '@/lib/billing/add-ons';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADD_ON_CATALOG, type AddOnId } from '@/lib/billing/addons';

const VALID_ADD_ON_IDS = new Set<AddOnId>(ADD_ON_CATALOG.map((addOn) => addOn.id));
const ACTIVE_ADD_ON_STATUSES = ['active'] as const;

type OrganizationAddOnRow = {
  add_on_id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

export function isActiveAddOnRow(row: OrganizationAddOnRow, now: Date) {
  if (!row.add_on_id || !VALID_ADD_ON_IDS.has(row.add_on_id as AddOnId)) {
    return false;
  }

  const catalogAddOn = getBillingAddOn(row.add_on_id);
  if (!catalogAddOn || !isBillingAddOnCommerciallyActive(catalogAddOn)) {
    return false;
  }

  if (!row.status || !ACTIVE_ADD_ON_STATUSES.includes(row.status as (typeof ACTIVE_ADD_ON_STATUSES)[number])) {
    return false;
  }

  if (!row.current_period_end) {
    return true;
  }

  const currentPeriodEnd = new Date(row.current_period_end);
  return !Number.isNaN(currentPeriodEnd.getTime()) && currentPeriodEnd > now;
}

export async function listActiveOrganizationAddOns(organizationId: string): Promise<AddOnId[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('organization_add_ons')
    .select('add_on_id,status,current_period_end')
    .eq('organization_id', organizationId)
    .in('status', [...ACTIVE_ADD_ON_STATUSES]);

  if (error) {
    console.warn('[billing:addons] active_add_ons_lookup_failed', { code: error.code ?? 'unknown' });
    return [];
  }

  const now = new Date();
  const activeIds = new Set<AddOnId>();

  for (const row of (data ?? []) as OrganizationAddOnRow[]) {
    if (isActiveAddOnRow(row, now)) {
      activeIds.add(row.add_on_id as AddOnId);
    }
  }

  return [...activeIds];
}