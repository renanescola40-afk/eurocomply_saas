import { noStoreJson } from '@/server/security/no-store';
import { normalizeOrganizationRole, roleHasPermission, type OrganizationPermission, type OrganizationRole } from '@/lib/security/permissions';

export {
  getOrganizationPermissionMatrix,
  getRolePermissions,
  normalizeOrganizationRole,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  roleHasPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/lib/security/permissions';

type MembershipRow = {
  organization_id: string;
  role: string | null;
  status?: string | null;
};

type MembershipQueryError = {
  code?: string | null;
};

export type PermissionCheckAllowed = {
  ok: true;
  status: 200;
  role: OrganizationRole;
  rawRole: string | null;
  permission: OrganizationPermission;
};

export type PermissionCheckDenied = {
  ok: false;
  status: 403 | 503;
  error: string;
  message: string;
  role?: OrganizationRole;
  rawRole?: string | null;
  permission: OrganizationPermission;
};

export type PermissionCheckResult = PermissionCheckAllowed | PermissionCheckDenied;

const COMMERCIAL_PRODUCT_PERMISSIONS = new Set<OrganizationPermission>([
  'manage_documents',
  'read_documents',
  'manage_vendors',
  'read_vendors',
  'manage_risks',
  'read_risks',
  'manage_ai_governance',
  'read_ai_governance',
  'manage_ai_incidents',
  'read_ai_incidents',
  'read_audit',
  'export_data',
]);

function isSupabaseUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isActiveOrganizationMembership(status: string | null | undefined) {
  return typeof status === 'string' && status.trim().toLowerCase() === 'active';
}

async function recordRbacDeniedAuditEvent({
  userId,
  organizationId,
  result,
}: {
  userId: string;
  organizationId: string;
  result: PermissionCheckDenied;
}) {
  try {
    const { writeAuditLog } = await import('@/lib/security/audit-log');
    await writeAuditLog({
      action: 'security.failure',
      organizationId,
      actorUserId: userId,
      entityType: 'rbac_denial',
      entityId: result.permission,
      metadata: {
        securityEvent: 'rbac.denied',
        permission: result.permission,
        reason: result.error,
        status: result.status,
        role: result.role ?? null,
        rawRole: result.rawRole ?? null,
      },
    });
  } catch {
    // Keep the original authorization result even if best-effort audit logging fails.
  }
}

async function assertCommercialProductAuthority({
  userId,
  organizationId,
  permission,
  role,
  rawRole,
}: {
  userId: string;
  organizationId: string;
  permission: OrganizationPermission;
  role: OrganizationRole;
  rawRole: string | null;
}): Promise<PermissionCheckDenied | null> {
  if (!COMMERCIAL_PRODUCT_PERMISSIONS.has(permission)) return null;

  try {
    const { getOrganizationBillingAuthority } = await import('@/server/queries/subscription');
    const authority = await getOrganizationBillingAuthority(organizationId);

    if (authority.licensed) return null;

    const result: PermissionCheckDenied = {
      ok: false,
      status: 403,
      error: 'subscription_required',
      message: 'An active paid subscription or signed contract is required.',
      role,
      rawRole,
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  } catch {
    const result: PermissionCheckDenied = {
      ok: false,
      status: 503,
      error: 'billing_authority_unavailable',
      message: 'Could not verify commercial product authority.',
      role,
      rawRole,
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  }
}

export async function getOrganizationMembership(userId: string, organizationId: string) {
  if (!isSupabaseUserId(userId)) {
    return { membership: null, error: null };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  const statusAware = await supabase
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  let membership = statusAware.data as unknown as MembershipRow | null;
  let membershipError = statusAware.error as MembershipQueryError | null;

  // Production is being migrated forward to the canonical status column. Only
  // the exact missing-column SQLSTATE may use the temporary legacy projection;
  // every other provider/query failure remains fail-closed.
  if (membershipError?.code === '42703') {
    const legacy = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    membership = legacy.data
      ? { ...(legacy.data as unknown as Omit<MembershipRow, 'status'>), status: 'active' }
      : null;
    membershipError = legacy.error as MembershipQueryError | null;
  }

  if (membershipError) {
    return { membership: null, error: membershipError };
  }

  if (membership && !isActiveOrganizationMembership(membership.status)) {
    return { membership: null, error: null };
  }

  return { membership, error: null };
}

export async function assertOrganizationPermission({
  userId,
  organizationId,
  permission,
}: {
  userId: string;
  organizationId: string;
  permission: OrganizationPermission;
}): Promise<PermissionCheckResult> {
  const { membership, error } = await getOrganizationMembership(userId, organizationId);

  if (error) {
    const result: PermissionCheckDenied = {
      ok: false,
      status: 503,
      error: 'rbac_check_failed',
      message: 'Could not verify organization permissions.',
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  }

  if (!membership) {
    const result: PermissionCheckDenied = {
      ok: false,
      status: 403,
      error: 'organization_membership_required',
      message: 'You are not an active member of this organization.',
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  }

  const role = normalizeOrganizationRole(membership.role);

  if (!roleHasPermission(role, permission)) {
    const result: PermissionCheckDenied = {
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      message: 'Your organization role does not allow this action.',
      role,
      rawRole: membership.role,
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  }

  const commercialAuthorityDenied = await assertCommercialProductAuthority({
    userId,
    organizationId,
    permission,
    role,
    rawRole: membership.role,
  });
  if (commercialAuthorityDenied) return commercialAuthorityDenied;

  return {
    ok: true,
    status: 200,
    role,
    rawRole: membership.role,
    permission,
  };
}

export function permissionDeniedResponse(result: PermissionCheckResult) {
  return noStoreJson(
    {
      error: result.ok ? 'permission_denied' : result.error,
      message: result.ok ? 'Permission denied.' : result.message,
      requiredPermission: result.permission,
      role: result.role,
    },
    { status: result.ok ? 403 : result.status },
  );
}
