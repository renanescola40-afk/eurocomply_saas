import { createAdminClient } from '@/lib/supabase/admin';

export type CanonicalSubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise';
export type LegacySubscriptionPlan = 'essential' | 'growth';
export type SubscriptionPlan = CanonicalSubscriptionPlan | LegacySubscriptionPlan;

const SUBSCRIPTION_PLAN_UNAVAILABLE = 'subscription_plan_unavailable';

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  essential: 1,
  starter: 1,
  growth: 2,
  professional: 2,
  business: 3,
  enterprise: 4,
};

type OrganizationSubscriptionRow = {
  plan?: string | null;
  tier?: string | null;
  status?: string | null;
};

export function normalizePlan(value: string | null | undefined): CanonicalSubscriptionPlan {
  const normalized = value?.toLowerCase().trim();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional' || normalized === 'pro' || normalized === 'growth') return 'professional';

  return 'starter';
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
    throw new Error(SUBSCRIPTION_PLAN_UNAVAILABLE);
  }

  return data;
}

export async function getOrganizationPlan(organizationId: string): Promise<CanonicalSubscriptionPlan> {
  const primary = await getLatestSubscriptionRow(organizationId, 'plan,status,created_at');

  if (primary?.plan) return normalizePlan(primary.plan);

  const legacy = await getLatestSubscriptionRow(organizationId, 'tier,status,created_at');

  if (legacy?.tier) return normalizePlan(legacy.tier);

  return 'starter';
}

export async function requirePlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const plan = await getOrganizationPlan(organizationId);

  if (!isPlanAtLeast(plan, minimumPlan)) throw new Error(`${minimumPlan}_required`);

  return plan;
}

export async function requireProfessionalPlan(organizationId: string) {
  return requirePlanAtLeast(organizationId, 'professional');
}

export async function requireGrowthPlan(organizationId: string) {
  return requireProfessionalPlan(organizationId);
}

export async function requireBusinessPlan(organizationId: string) {
  return requirePlanAtLeast(organizationId, 'business');
}

export async function requireEnterprisePlan(organizationId: string) {
  return requirePlanAtLeast(organizationId, 'enterprise');
}
