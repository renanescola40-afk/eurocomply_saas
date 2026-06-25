import { noStoreJson } from '@/server/security/no-store';

export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'member';

export type OrganizationPermission =
  | 'manage_billing'
  | 'manage_team'
  | 'manage_documents'
  | 'read_documents'
  | 'manage_vendors'
  | 'read_vendors'
  | 'manage_risks'
  | 'read_risks'
  | 'manage_ai_governance'
  | 'read_ai_governance'
  | 'manage_ai_incidents'
  | 'read_ai_incidents'
  | 'read_audit'
  | 'export_data'
  | 'manage_settings';

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

export type PermissionCheckResult = {
  ok: boolean;
  status: 200 | 403 | 503;
  error?: string;
  message?: string;
  role?: OrganizationRole;
  rawRole?: string | null;
  permission: OrganizationPermission;
};

export const ORGANIZATION_ROLES: OrganizationRole[] = ['owner', 'admin', 'editor', 'member', 'viewer'];

export const ORGANIZATION_PERMISSIONS: OrganizationPermission[] = [
  'manage_billing',
  'manage_team',
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
  'manage_settings',
];

const ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  owner: [
    'manage_billing',
    'manage_team',
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
    'manage_settings',
  ],
  admin: [
    'manage_billing',
    'manage_team',
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
    'manage_settings',
  ],
  editor: [
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
    'export_data',
  ],
  member: [
    'manage_documents',
    'read_documents',
    'read_vendors',
    'read_risks',
    'read_ai_governance',
    'read_ai_incidents',
  ],
  viewer: ['read_documents', 'read_vendors', 'read_risks', 'read_ai_governance', 'read_ai_incidents'],
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getRolePermissions(role: string | null | undefined) {
  return [...ROLE_PERMISSIONS[normalizeOrganizationRole(role)]];
}

export function getOrganizationPermissionMatrix() {
  return ORGANIZATION_ROLES.map((role) => ({
    role,
    permissions: getRolePermissions(role),
  }));
}

export function normalizeOrganizationRole(role: string | null | undefined): OrganizationRole {
  const normalized = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/^org:/, '');

  if (['owner', 'proprietario', 'proprietário', 'dono'].includes(normalized)) return 'owner';
  if (['admin', 'administrator', 'administrador'].includes(normalized)) return 'admin';
  if (['editor', 'manager', 'gestor'].includes(normalized)) return 'editor';
  if (['visualizador', 'viewer', 'read_only', 'readonly', 'leitor'].includes(normalized)) return 'viewer';
  if (['member', 'membro'].includes(normalized)) return 'member';

  return 'viewer';
}

export function roleHasPermission(role: string | null | undefined, permission: OrganizationPermission) {
  const normalizedRole = normalizeOrganizationRole(role);
  return ROLE_PERMISSIONS[normalizedRole].includes(permission);
}

async function recordRbacDeniedAuditEvent({
  userId,
  organizationId,
  result,
}: {
  userId: string;
  organizationId: string;
  result: PermissionCheckResult;
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
        reason: result.error ?? 'permission_denied',
        status: result.status,
        role: result.role ?? null,
        rawRole: result.rawRole ?? null,
      },
    });
  } catch {
    // Keep the original authorization result even if best-effort audit logging fails.
  }
}

export async function getOrganizationMembership(userId: string, organizationId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const identityColumn = isUuid(userId) ? 'user_id' : 'clerk_user_id';

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('organization_id', organizationId)
    .eq(identityColumn, userId)
    .maybeSingle();

  if (error) {
    return { membership: null, error };
  }

  return { membership: data as unknown as MembershipRow | null, error: null };
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
    const result: PermissionCheckResult = {
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
    const result: PermissionCheckResult = {
      ok: false,
      status: 403,
      error: 'organization_membership_required',
      message: 'You are not a member of this organization.',
      permission,
    };
    await recordRbacDeniedAuditEvent({ userId, organizationId, result });
    return result;
  }

  const role = normalizeOrganizationRole(membership.role);

  if (!roleHasPermission(role, permission)) {
    const result: PermissionCheckResult = {
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
      error: result.error ?? 'permission_denied',
      message: result.message ?? 'Permission denied.',
      requiredPermission: result.permission,
      role: result.role,
    },
    { status: result.status === 200 ? 403 : result.status },
  );
}
