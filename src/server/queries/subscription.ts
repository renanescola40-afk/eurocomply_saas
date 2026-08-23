import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from '@/server/billing/subscription-authority';

export type CanonicalSubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise';
export type LegacySubscriptionPlan = 'essential' | 'growth';
export type SubscriptionPlan = CanonicalSubscriptionPlan | LegacySubscriptionPlan;
export type BillingAuthoritySource = 'signed_contract' | 'live_stripe' | 'none';

export type OrganizationBillingAuthority = {
  plan: CanonicalSubscriptionPlan;
  licensed: boolean;
  source: BillingAuthoritySource;
};

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
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

/**
 * Compatibility normalizer for display/catalog consumers. This intentionally
 * preserves the historical starter fallback, but it is NOT a paid-access
 * decision. Paid access must use getOrganizationBillingAuthority().licensed.
 */
export function normalizePlan(value: string | null | undefined): CanonicalSubscriptionPlan {
  const normalized = value?.toLowerCase().trim();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional' || normalized === 'pro' || normalized === 'growth') return 'professional';

  return 'starter';
}

function normalizeAuthoritativePlan(value: string | null | undefined): CanonicalSubscriptionPlan | null {
  const normalized = value?.toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional' || normalized === 'pro' || normalized === 'growth') return 'professional';
  if (normalized === 'starter' || normalized === 'essential' || normalized === 'basic') return 'starter';
  return null;
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
    // RISCK COMPLY has no public free-trial access. A Stripe `trialing` row may
    // be displayed/recovered by billing UX, but it is not a commercial key.
    .eq('status', 'active')
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

async function rowHasLiveStripeAuthority(organizationId: string, row: OrganizationSubscriptionRow | null) {
  if (!row?.stripe_customer_id || !row.stripe_subscription_id) return false;

  return hasProcessedLiveStripeSubscriptionAuthority({
    organizationId,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  });
}

function requireAuthoritativePlan(value: string | null | undefined, source: Exclude<BillingAuthoritySource, 'none'>) {
  const plan = normalizeAuthoritativePlan(value);
  if (plan) return plan;

  console.warn('[subscription] authoritative_plan_invalid', { source });
  throw new Error(SUBSCRIPTION_PLAN_UNAVAILABLE);
}

/**
 * Resolve commercial authority independently from the compatibility plan label.
 * A local subscriptions row, status flag, checkout redirect, client flag, seeded
 * record, trialing status or test-mode Stripe identifier cannot set licensed=true.
 */
export async function getOrganizationBillingAuthority(
  organizationId: string,
): Promise<OrganizationBillingAuthority> {
  const signedContractPlan = await getAuthoritativeSignedContractPlan(organizationId);
  if (signedContractPlan) {
    return {
      plan: requireAuthoritativePlan(signedContractPlan, 'signed_contract'),
      licensed: true,
      source: 'signed_contract',
    };
  }

  const primary = await getLatestSubscriptionRow(
    organizationId,
    'plan,status,created_at,stripe_customer_id,stripe_subscription_id',
  );

  if (primary?.plan && await rowHasLiveStripeAuthority(organizationId, primary)) {
    return {
      plan: requireAuthoritativePlan(primary.plan, 'live_stripe'),
      licensed: true,
      source: 'live_stripe',
    };
  }

  const legacy = await getLatestSubscriptionRow(
    organizationId,
    'tier,status,created_at,stripe_customer_id,stripe_subscription_id',
  );

  if (legacy?.tier && await rowHasLiveStripeAuthority(organizationId, legacy)) {
    return {
      plan: requireAuthoritativePlan(legacy.tier, 'live_stripe'),
      licensed: true,
      source: 'live_stripe',
    };
  }

  // Starter remains a compatibility/display fallback only. licensed=false is
  // the commercial authority and downstream entitlement gates must preserve it.
  return { plan: 'starter', licensed: false, source: 'none' };
}

export async function getOrganizationPlan(organizationId: string): Promise<CanonicalSubscriptionPlan> {
  return (await getOrganizationBillingAuthority(organizationId)).plan;
}

export async function requirePlanAtLeast(organizationId: string, minimumPlan: SubscriptionPlan) {
  const authority = await getOrganizationBillingAuthority(organizationId);
  if (!authority.licensed || !isPlanAtLeast(authority.plan, minimumPlan)) {
    throw new Error(`${minimumPlan}_required`);
  }

  return authority.plan;
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
