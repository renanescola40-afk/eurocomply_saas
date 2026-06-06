import { assertOrganizationPermission, type OrganizationPermission, type OrganizationRole } from '@/lib/security/permissions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getOrganizationRoleForUser(organizationId: string, userId: string): Promise<OrganizationRole | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  return data.role as OrganizationRole;
}

export async function assertCurrentUserCan(organizationId: string, userId: string, permission: OrganizationPermission) {
  const role = await getOrganizationRoleForUser(organizationId, userId);
  assertOrganizationPermission(role, permission);
  return role;
}
