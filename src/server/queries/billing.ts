import { createAdminClient } from '@/lib/supabase/admin';

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
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error) {
    console.warn(`[billing] Failed to count ${table}:`, error.message);
    return 0;
  }

  return count ?? 0;
}

async function getSubscription(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('[billing] Failed to load subscription:', error.message);
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
    plan: subscription?.plan ?? 'starter',
    status: subscription?.status ?? null,
    usage: {
      users,
      documents,
      vendors,
      risks,
    },
  };
}
