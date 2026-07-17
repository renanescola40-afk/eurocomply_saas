import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
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

const ACTIVE_BILLING_STATUSES = ['active', 'trialing'] as const;
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

async function getSubscription(supabase: SupabaseAdminClient, organizationId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status,updated_at,created_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[billing] subscription_lookup_failed', { code: error.code ?? 'unknown' });
    throw new Error(BILLING_CONTEXT_UNAVAILABLE);
  }

  return data;
}

export async function getOrganizationBillingContext(
  organizationId: string,
): Promise<OrganizationBillingContext> {
  noStore();

  const supabase = createAdminClient();
  const [subscription, users, documents, vendors, risks] = await Promise.all([
    getSubscription(supabase, organizationId),
    countRows(supabase, 'organization_members', organizationId),
    countRows(supabase, 'documents', organizationId),
    countRows(supabase, 'vendors', organizationId),
    countRows(supabase, 'risks', organizationId),
  ]);

  const status = subscription?.status ?? null;
  const plan = hasPaidEntitlementStatus(status)
    ? normalizePlan(subscription?.plan ?? SAFE_DEFAULT_PLAN)
    : SAFE_DEFAULT_PLAN;

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
