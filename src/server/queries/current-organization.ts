import { createAdminClient } from '@/lib/supabase/admin';

export async function getUserOrganizationMemberships(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getCurrentOrganizationForUser(userId: string, slug?: string) {
  const memberships = await getUserOrganizationMemberships(userId);

  if (slug) {
    return memberships.find((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;

      return organization?.slug === slug;
    }) ?? null;
  }

  return memberships[0] ?? null;
}
