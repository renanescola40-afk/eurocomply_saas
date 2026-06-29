import { assertOrganizationPermission, type OrganizationPermission, type OrganizationRole } from '@/lib/security/permissions';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getOrganizationRoleForUser(organizationId: string, userId: string): Promise<OrganizationRole | null> {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    console.error('[auth] Missing Supabase admin client while checking organization permissions');
    return null;
  }

  const identityColumn = isUuid(userId) ? 'user_id' : 'clerk_user_id';
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq(identityColumn, userId)
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
