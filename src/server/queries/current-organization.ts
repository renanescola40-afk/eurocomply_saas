import { auth } from '@clerk/nextjs/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

type RawOrganizationMembership = {
  organization_id: string;
  role: string;
  organizations:
    | {
        id: string;
        name: string;
        slug: string | null;
        clerk_org_id: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string | null;
        clerk_org_id: string | null;
      }>
    | null;
};

export type CurrentOrganizationMembership = {
  organization_id: string;
  id: string;
  role: string;
  name: string;
  slug: string | null;
  clerk_org_id: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    clerk_org_id: string | null;
  };
  organizations: {
    id: string;
    name: string;
    slug: string | null;
    clerk_org_id: string | null;
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
    clerk_org_id: organization.clerk_org_id,
    organization,
    organizations: organization,
  };
}

async function resolveActiveClerkOrgId(userId: string, activeClerkOrgId?: string | null) {
  if (activeClerkOrgId || isUuid(userId)) return activeClerkOrgId ?? null;

  try {
    const authState = await auth();
    return authState.orgId ?? null;
  } catch {
    return null;
  }
}

export async function getUserOrganizationMemberships(
  userId: string,
  options: GetUserOrganizationMembershipsOptions = {},
) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const safeLimit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const identityColumn = isUuid(userId) ? 'user_id' : 'clerk_user_id';
  // Legacy Supabase auth membership invariant: eq('user_id', userId). Clerk identity uses clerk_user_id.

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, clerk_org_id)')
    .eq(identityColumn, userId)
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

export async function getCurrentOrganizationForUser(userId: string, slug?: string, activeClerkOrgId?: string | null) {
  const memberships = await getUserOrganizationMemberships(userId);
  const clerkOrgId = await resolveActiveClerkOrgId(userId, activeClerkOrgId);

  if (clerkOrgId) {
    const activeMembership = memberships.find((membership) => membership.clerk_org_id === clerkOrgId);
    if (activeMembership) return activeMembership;
  }

  if (slug) {
    return memberships.find((membership) => membership.slug === slug) ?? null;
  }

  return memberships[0] ?? null;
}
