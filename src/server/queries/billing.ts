import { unstable_noStore as noStore } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAuthoritativeSignedContractPlan,
  hasProcessedLiveStripeSubscriptionAuthority,
} from '@/server/billing/subscription-authority';
import { normalizePlan } from '@/server/queries/subscription';

export type BillingUsage = {
  users: number;
  documents: number;
  vendors: number;
  risks: number;
};

export type OrganizationBillingContext = {
  plan: string;
  status: string | null;
  usage: BillingUsage;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type BillingCountTable = 'organization_members' | 'documents' | 'vendors' | 'risks';

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const ACTIVE_BILLING_STATUSES = ['active'] as const;
const SAFE_DEFAULT_PLAN = 'starter';
const BILLING_CONTEXT_UNAVAILABLE = 'billing_context_unavailable';

function hasPaidEntitlementStatus(status: string | null | undefined) {
  return ACTIVE_BILLING_STATUSES.includes(status as (typeof ACTIVE_BILLING_STATUSES)[number]);
}

async function countRows(supabase: SupabaseAdminClient, table: BillingCountTable, organizationId: string) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[billing] count_failed', { table, code: error.code ?? 'unknown' });
    throw new Error(BILLING_CONTEXT_UNAVAILABLE);
  }

  return count ?? 0;
}

async function getSubscription(supabase: SupabaseAdminClient, organizationId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status,stripe_customer_id,stripe_subscription_id,updated_at,created_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    console.warn('[billing] subscription_lookup_failed', { code: error.code ?? 'unknown' });
    throw new Error(BILLING_CONTEXT_UNAVAILABLE);
  }

  return data ?? null;
}

export async function getOrganizationBillingContext(
  organizationId: string,
): Promise<OrganizationBillingContext> {
  noStore();

  const supabase = createAdminClient();
  const [subscription, signedContractPlan, users, documents, vendors, risks] = await Promise.all([
    getSubscription(supabase, organizationId),
    getAuthoritativeSignedContractPlan(organizationId),
    countRows(supabase, 'organization_members', organizationId),
    countRows(supabase, 'documents', organizationId),
    countRows(supabase, 'vendors', organizationId),
    countRows(supabase, 'risks', organizationId),
  ]);

  const liveStripeAuthority = signedContractPlan
    ? false
    : await hasProcessedLiveStripeSubscriptionAuthority({
        organizationId,
        stripeCustomerId: subscription?.stripe_customer_id,
        stripeSubscriptionId: subscription?.stripe_subscription_id,
      });
  const livePaidStatus = liveStripeAuthority && hasPaidEntitlementStatus(subscription?.status);
  const plan = signedContractPlan
    ? normalizePlan(signedContractPlan)
    : livePaidStatus
      ? normalizePlan(subscription?.plan ?? SAFE_DEFAULT_PLAN)
      : SAFE_DEFAULT_PLAN;
  const status = signedContractPlan
    ? 'active'
    : livePaidStatus
      ? subscription?.status ?? null
      : null;

  return {
    plan,
    status,
    usage: {
      users,
      documents,
      vendors,
      risks,
    },
  };
}