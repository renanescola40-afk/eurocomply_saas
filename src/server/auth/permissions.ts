import {
  assertOrganizationPermission,
  getOrganizationMembership,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/server/security/rbac';

export type LegacyOrganizationPermission =
  | 'organization:read'
  | 'organization:update'
  | 'team:read'
  | 'team:invite'
  | 'team:remove'
  | 'billing:manage'
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'vendors:read'
  | 'vendors:write'
  | 'vendors:delete'
  | 'risks:read'
  | 'risks:write'
  | 'risks:delete'
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:delete'
  | 'reports:read'
  | 'exports:create'
  | 'audit:read';

const LEGACY_PERMISSION_MAP: Record<LegacyOrganizationPermission, OrganizationPermission> = {
  'organization:read': 'read_ai_governance',
  'organization:update': 'manage_settings',
  'team:read': 'manage_team',
  'team:invite': 'manage_team',
  'team:remove': 'manage_team',
  'billing:manage': 'manage_billing',
  'documents:read': 'read_documents',
  'documents:write': 'manage_documents',
  'documents:delete': 'manage_documents',
  'vendors:read': 'read_vendors',
  'vendors:write': 'manage_vendors',
  'vendors:delete': 'manage_vendors',
  'risks:read': 'read_risks',
  'risks:write': 'manage_risks',
  'risks:delete': 'manage_risks',
  'tasks:read': 'read_ai_governance',
  'tasks:write': 'manage_ai_governance',
  'tasks:delete': 'manage_ai_governance',
  'reports:read': 'read_ai_governance',
  'exports:create': 'export_data',
  'audit:read': 'read_audit',
};

// Server Actions are callable independently from page/layout routing. Keep the
// narrow purchase bootstrap (`manage_settings` for onboarding draft metadata and
// `manage_billing` for checkout/recovery) reachable before payment, but require
// durable commercial authority for team administration. All other product
// permissions are already covered by the canonical commercial set in RBAC.
const SERVER_ACTION_MINIMUM_PLAN_BY_PERMISSION: Partial<Record<OrganizationPermission, 'starter'>> = {
  manage_team: 'starter',
};

export type ServerActionPermission = OrganizationPermission | LegacyOrganizationPermission;

function normalizeServerActionPermission(permission: ServerActionPermission): OrganizationPermission {
  return LEGACY_PERMISSION_MAP[permission as LegacyOrganizationPermission] ?? (permission as OrganizationPermission);
}

export async function getOrganizationRoleForUser(organizationId: string, userId: string): Promise<OrganizationRole | null> {
  const { membership, error } = await getOrganizationMembership(userId, organizationId);

  if (error || !membership?.role) {
    return null;
  }

  return membership.role as OrganizationRole;
}

export async function assertCurrentUserCan(organizationId: string, userId: string, permission: ServerActionPermission) {
  const requiredPermission = normalizeServerActionPermission(permission);
  const result = await assertOrganizationPermission({
    userId,
    organizationId,
    permission: requiredPermission,
    minimumPlan: SERVER_ACTION_MINIMUM_PLAN_BY_PERMISSION[requiredPermission],
  });

  if (!result.ok) {
    throw new Error(`Missing required organization permission: ${permission}`);
  }

  return result.role ?? null;
}
