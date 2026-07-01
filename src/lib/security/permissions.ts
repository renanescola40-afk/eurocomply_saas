export type OrganizationRole = 'owner' | 'admin' | 'editor' | 'member' | 'viewer';

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
  owner: ORGANIZATION_PERMISSIONS,
  admin: ORGANIZATION_PERMISSIONS,
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

export function getRolePermissions(role: string | null | undefined) {
  return [...ROLE_PERMISSIONS[normalizeOrganizationRole(role)]];
}

export function getOrganizationPermissions(role: string | null | undefined) {
  return getRolePermissions(role);
}

export function getOrganizationPermissionMatrix() {
  return ORGANIZATION_ROLES.map((role) => ({
    role,
    permissions: getRolePermissions(role),
  }));
}

export function roleHasPermission(role: string | null | undefined, permission: OrganizationPermission) {
  const normalizedRole = normalizeOrganizationRole(role);
  return ROLE_PERMISSIONS[normalizedRole].includes(permission);
}

export const hasOrganizationPermission = roleHasPermission;

export function assertOrganizationPermission(role: string | null | undefined, permission: OrganizationPermission) {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Missing required organization permission: ${permission}`);
  }
}
