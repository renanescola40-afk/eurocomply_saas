import { createAdminClient } from '@/lib/supabase/admin';

export type SubscriptionPlan = 'essential' | 'professional' | 'business' | 'enterprise';

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  essential: 1,
  professional: 2,
  business: 3,
  enterprise: 4,
};

type OrganizationSubscriptionRow = {
  plan?: string | null;
  tier?: string | null;
  status?: string | null;
};

export function normalizePlan(value: string | null | undefined): SubscriptionPlan {
  const normalized = value?.toLowerCase().trim();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional' || normalized === 'pro') return 'professional';

  return 'essential';
}

export function isPlanAtLeast(plan: SubscriptionPlan, minimumPlan: SubscriptionPlan) {
  return PLAN_RANK[plan] >= PLAN_RANK[minimumPlan];
}

async function getLatestSubscriptionRow(organizationId: string, select: string): Promise<OrganizationSubscriptionRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(select)
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<OrganizationSubscriptionRow>();

  if (error) {
    if (error.code === '42703') return null;
    console.warn('[subscription] plan_lookup_failed', { code: error.code ?? 'unknown' });
    return null;
  }

  return data;
}

export async function getOrganizationPlan(organizationId: string): Promise<SubscriptionPlan> {
  const primary = await getLatestSubscriptionRow(organizationId, 'plan,status,created_at');

  if (primary?.plan) {
    return normalizePlan(primary.plan);
  }

  const legacy = await getLatestSubscriptionRow(organizationId, 'tier,status,created_at');

  if (legacy?.tier) {
    return normalizePlan(legacy.tier);
  }

  return 'essential';
}

export async function requirePlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const plan = await getOrganizationPlan(organizationId);

  if (!isPlanAtLeast(plan, minimumPlan)) {
    throw new Error(`${minimumPlan}_required`);
  }

  return plan;
}

export async function requireBusinessPlan(organizationId: string) {
  return requirePlanAtLeast(organizationId, 'business');
}

export async function requireEnterprisePlan(organizationId: string) {
  return requirePlanAtLeast(organizationId, 'enterprise');
}
