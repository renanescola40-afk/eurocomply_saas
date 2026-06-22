import { tryCreateAdminClient } from '@/lib/supabase/admin';

type RawOrganizationMembership = {
  organization_id: string;
  role: string;
  organizations:
    | {
        id: string;
        name: string;
        slug: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string | null;
      }>
    | null;
};

export type CurrentOrganizationMembership = {
  organization_id: string;
  id: string;
  role: string;
  name: string;
  slug: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
  };
  organizations: {
    id: string;
    name: string;
    slug: string | null;
  };
};

type GetUserOrganizationMembershipsOptions = {
  limit?: number;
};

function normalizeMembership(membership: RawOrganizationMembership): CurrentOrganizationMembership | null {
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

  if (!organization) {
    return null;
  }

  return {
    organization_id: membership.organization_id,
    id: organization.id,
    role: membership.role,
    name: organization.name,
    slug: organization.slug,
    organization,
    organizations: organization,
  };
}

export async function getUserOrganizationMemberships(
  userId: string,
  options: GetUserOrganizationMembershipsOptions = {},
) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const safeLimit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .range(0, safeLimit - 1);

  if (error) {
    console.warn('[organization] memberships_lookup_failed', { code: error.code ?? 'unknown' });
    return [];
  }

  return ((data ?? []) as RawOrganizationMembership[])
    .map(normalizeMembership)
    .filter((membership): membership is CurrentOrganizationMembership => Boolean(membership));
}

export async function getCurrentOrganizationForUser(userId: string, slug?: string) {
  const memberships = await getUserOrganizationMemberships(userId);

  if (slug) {
    return memberships.find((membership) => membership.slug === slug) ?? null;
  }

  return memberships[0] ?? null;
}
