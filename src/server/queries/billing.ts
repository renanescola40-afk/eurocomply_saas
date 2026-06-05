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
    throw error;
  }

  return count ?? 0;
}

export async function getOrganizationBillingContext(
  organizationId: string,
): Promise<OrganizationBillingContext> {
  const supabase = createAdminClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const [users, documents, vendors, risks] = await Promise.all([
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
