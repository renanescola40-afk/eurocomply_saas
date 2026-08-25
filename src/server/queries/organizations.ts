import { getUserOrganizationMemberships } from '@/server/queries/current-organization';

export async function listUserOrganizations(userId: string) {
  const memberships = await getUserOrganizationMemberships(userId);

  return memberships.map((membership) => ({
    role: membership.role,
    organization_id: membership.organization_id,
    organizations: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
    },
  }));
}

export async function getCurrentOrganizationForUser(userId: string) {
  const memberships = await listUserOrganizations(userId);
  const firstMembership = memberships[0];
  const organization = firstMembership?.organizations;

  if (Array.isArray(organization)) {
    return organization[0] ?? null;
  }

  return organization ?? null;
}
