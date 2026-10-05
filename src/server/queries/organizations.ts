import { getUserOrganizationMemberships } from '@/server/queries/current-organization';
import { getCurrentOrganizationForUser as resolveCurrentOrganization } from '@/server/queries/current-organization';

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
  // Preserve this helper's organization-only return shape, while using the
  // same active-membership/SSO and onboarding selection as the dashboard.
  // Picking memberships[0] here selected a different tenant for API/detail
  // routes when an older, unfinished organization preceded the active one.
  const membership = await resolveCurrentOrganization(userId);
  return membership?.organization ?? null;
}
