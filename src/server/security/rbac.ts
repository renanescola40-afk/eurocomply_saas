import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

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

export function normalizeOrganizationRole(role: string | null | undefined): OrganizationRole {
  const normalized = String(role ?? '')
    .trim()
    .toLowerCase();

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

export async function getOrganizationMembership(userId: string, organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
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
    return {
      ok: false,
      status: 503,
      error: 'rbac_check_failed',
      message: 'Could not verify organization permissions.',
      permission,
    };
  }

  if (!membership) {
    return {
      ok: false,
      status: 403,
      error: 'organization_membership_required',
      message: 'You are not a member of this organization.',
      permission,
    };
  }

  const role = normalizeOrganizationRole(membership.role);

  if (!roleHasPermission(role, permission)) {
    return {
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      message: 'Your organization role does not allow this action.',
      role,
      rawRole: membership.role,
      permission,
    };
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
  return NextResponse.json(
    {
      error: result.error ?? 'permission_denied',
      message: result.message ?? 'Permission denied.',
      requiredPermission: result.permission,
      role: result.role,
    },
    { status: result.status === 200 ? 403 : result.status },
  );
}
