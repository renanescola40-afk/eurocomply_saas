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

async function countRows(table: string, organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return 0;

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

async function getSubscription(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return null;

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
  const [subscription, users, documents, vendors, risks] = await Promise.all([
    getSubscription(organizationId),
    countRows('organization_members', organizationId),
    countRows('documents', organizationId),
    countRows('vendors', organizationId),
    countRows('risks', organizationId),
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
