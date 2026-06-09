import { createAdminClient } from '@/lib/supabase/admin';

export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';

type OrganizationSubscriptionRow = {
  plan?: string | null;
  tier?: string | null;
  status?: string | null;
};

function normalizePlan(value: string | null | undefined): SubscriptionPlan {
  const normalized = value?.toLowerCase();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'pro') return 'pro';
  return 'basic';
}

export async function getOrganizationPlan(organizationId: string): Promise<SubscriptionPlan> {
  const supabase = createAdminClient();

  if (!supabase) {
    return 'basic';
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,tier,status')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<OrganizationSubscriptionRow>();

  if (error) {
    console.warn('[subscription] plan_lookup_failed', { code: error.code ?? 'unknown' });
    return 'basic';
  }

  return normalizePlan(data?.plan ?? data?.tier);
}

export async function requireEnterprisePlan(organizationId: string) {
  const plan = await getOrganizationPlan(organizationId);

  if (plan !== 'enterprise') {
    throw new Error('enterprise_required');
  }

  return plan;
}
