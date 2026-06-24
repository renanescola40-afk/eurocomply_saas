import { unstable_noStore as noStore } from 'next/cache';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
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

type SupabaseAdminClient = NonNullable<ReturnType<typeof tryCreateAdminClient>>;
type BillingCountTable = 'organization_members' | 'documents' | 'vendors' | 'risks';

function emptyBillingContext(): OrganizationBillingContext {
  return {
    plan: 'essential',
    status: null,
    usage: {
      users: 0,
      documents: 0,
      vendors: 0,
      risks: 0,
    },
  };
}

async function countRows(supabase: SupabaseAdminClient, table: BillingCountTable, organizationId: string) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[billing] count_failed', { table, code: error.code ?? 'unknown' });
    return 0;
  }

  return count ?? 0;
}

async function getSubscription(supabase: SupabaseAdminClient, organizationId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('[billing] subscription_lookup_failed', { code: error.code ?? 'unknown' });
    return null;
  }

  return data;
}

export async function getOrganizationBillingContext(
  organizationId: string,
): Promise<OrganizationBillingContext> {
  noStore();

  const supabase = tryCreateAdminClient();
  if (!supabase) return emptyBillingContext();

  const [subscription, users, documents, vendors, risks] = await Promise.all([
    getSubscription(supabase, organizationId),
    countRows(supabase, 'organization_members', organizationId),
    countRows(supabase, 'documents', organizationId),
    countRows(supabase, 'vendors', organizationId),
    countRows(supabase, 'risks', organizationId),
  ]);

  return {
    plan: normalizePlan(subscription?.plan ?? 'essential'),
    status: subscription?.status ?? null,
    usage: {
      users,
      documents,
      vendors,
      risks,
    },
  };
}
