export type OrganizationRole = 'owner' | 'admin' | 'member';

export type OrganizationPermission =
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

const rolePermissions: Record<OrganizationRole, OrganizationPermission[]> = {
  owner: [
    'organization:read',
    'organization:update',
    'team:read',
    'team:invite',
    'team:remove',
    'billing:manage',
    'documents:read',
    'documents:write',
    'documents:delete',
    'vendors:read',
    'vendors:write',
    'vendors:delete',
    'risks:read',
    'risks:write',
    'risks:delete',
    'tasks:read',
    'tasks:write',
    'tasks:delete',
    'reports:read',
    'exports:create',
    'audit:read',
  ],
  admin: [
    'organization:read',
    'organization:update',
    'team:read',
    'team:invite',
    'team:remove',
    'billing:manage',
    'documents:read',
    'documents:write',
    'documents:delete',
    'vendors:read',
    'vendors:write',
    'vendors:delete',
    'risks:read',
    'risks:write',
    'risks:delete',
    'tasks:read',
    'tasks:write',
    'tasks:delete',
    'reports:read',
    'exports:create',
    'audit:read',
  ],
  member: [
    'organization:read',
    'team:read',
    'documents:read',
    'documents:write',
    'vendors:read',
    'vendors:write',
    'risks:read',
    'risks:write',
    'tasks:read',
    'tasks:write',
    'reports:read',
    'exports:create',
  ],
};

export function hasOrganizationPermission(role: OrganizationRole | null | undefined, permission: OrganizationPermission) {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function assertOrganizationPermission(role: OrganizationRole | null | undefined, permission: OrganizationPermission) {
  if (!hasOrganizationPermission(role, permission)) {
    throw new Error(`Missing required organization permission: ${permission}`);
  }
}

export function getOrganizationPermissions(role: OrganizationRole) {
  return rolePermissions[role];
}
