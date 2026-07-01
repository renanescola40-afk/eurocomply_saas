import {
  assertOrganizationPermission,
  getOrganizationMembership,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/server/security/rbac';

export async function getOrganizationRoleForUser(organizationId: string, userId: string): Promise<OrganizationRole | null> {
  const { membership, error } = await getOrganizationMembership(userId, organizationId);

  if (error || !membership?.role) {
    return null;
  }

  return membership.role as OrganizationRole;
}

export async function assertCurrentUserCan(organizationId: string, userId: string, permission: OrganizationPermission) {
  const result = await assertOrganizationPermission({
    userId,
    organizationId,
    permission,
  });

  if (!result.ok) {
    throw new Error(`Missing required organization permission: ${permission}`);
  }

  return result.role ?? null;
}
