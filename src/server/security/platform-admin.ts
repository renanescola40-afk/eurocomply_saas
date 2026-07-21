import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type PlatformAdminRole =
  | 'owner'
  | 'sales_admin'
  | 'sales_rep'
  | 'support_admin'
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_billing'
  | 'platform_support'
  | 'platform_security'
  | 'platform_auditor';

export type PlatformAdminMembership = {
  userId: string;
  role: PlatformAdminRole;
  enabled: boolean;
};

export class PlatformAdminError extends Error {
  status: 403 | 503;
  code:
    | 'platform_admin_required'
    | 'platform_admin_check_failed'
    | 'platform_admin_mfa_required'
    | 'platform_admin_mfa_check_failed';

  constructor(code: PlatformAdminError['code'], status: PlatformAdminError['status']) {
    super(code);
    this.name = 'PlatformAdminError';
    this.code = code;
    this.status = status;
  }
}

type PlatformAdminMfaApi = {
  getAuthenticatorAssuranceLevel: () => Promise<{
    data?: { currentLevel?: string | null } | null;
    error?: { message?: string } | null;
  }>;
};

async function requirePlatformAdminAal2() {
  try {
    const supabase = await createServerSupabaseClient();
    const mfa = (supabase.auth as unknown as { mfa?: PlatformAdminMfaApi }).mfa;

    if (!mfa?.getAuthenticatorAssuranceLevel) {
      throw new PlatformAdminError('platform_admin_mfa_check_failed', 503);
    }

    const assurance = await mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) {
      throw new PlatformAdminError('platform_admin_mfa_check_failed', 503);
    }

    if (assurance.data?.currentLevel !== 'aal2') {
      throw new PlatformAdminError('platform_admin_mfa_required', 403);
    }
  } catch (error) {
    if (error instanceof PlatformAdminError) throw error;
    throw new PlatformAdminError('platform_admin_mfa_check_failed', 503);
  }
}

export function normalizePlatformAdminRole(role: string | null | undefined): PlatformAdminRole | null {
  const normalized = String(role ?? '').trim().toLowerCase();

  switch (normalized) {
    case 'owner':
    case 'sales_admin':
    case 'sales_rep':
    case 'support_admin':
    case 'platform_owner':
    case 'platform_admin':
    case 'platform_billing':
    case 'platform_support':
    case 'platform_security':
    case 'platform_auditor':
      return normalized;
    default:
      return null;
  }
}

export function platformRoleHasCapability(
  role: PlatformAdminRole,
  capability: 'organizations' | 'contracts' | 'billing' | 'support' | 'security' | 'audit',
): boolean {
  const matrix: Record<PlatformAdminRole, ReadonlySet<typeof capability>> = {
    owner: new Set(['organizations', 'contracts', 'billing', 'support', 'security', 'audit']),
    platform_owner: new Set(['organizations', 'contracts', 'billing', 'support', 'security', 'audit']),
    platform_admin: new Set(['organizations', 'contracts', 'billing', 'support', 'security', 'audit']),
    sales_admin: new Set(['organizations', 'contracts', 'billing', 'support']),
    sales_rep: new Set(['organizations', 'support']),
    support_admin: new Set(['support', 'audit']),
    platform_billing: new Set(['contracts', 'billing', 'audit']),
    platform_support: new Set(['support', 'audit']),
    platform_security: new Set(['security', 'audit']),
    platform_auditor: new Set(['audit']),
  };

  return matrix[role].has(capability);
}

export async function getPlatformAdminMembership(userId: string): Promise<PlatformAdminMembership | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('platform_admin_users')
    .select('user_id, role, enabled')
    .eq('user_id', userId)
    .eq('enabled', true)
    .maybeSingle();

  if (error) throw new PlatformAdminError('platform_admin_check_failed', 503);

  const role = normalizePlatformAdminRole(data?.role);
  if (!data || !role || data.enabled !== true) return null;

  return { userId: data.user_id, role, enabled: data.enabled };
}

export async function requirePlatformAdmin(
  userId: string,
  allowedRoles: PlatformAdminRole[] = ['owner', 'sales_admin', 'platform_owner', 'platform_admin'],
): Promise<PlatformAdminMembership> {
  const membership = await getPlatformAdminMembership(userId);

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new PlatformAdminError('platform_admin_required', 403);
  }

  await requirePlatformAdminAal2();

  return membership;
}

export async function requirePlatformCapability(
  userId: string,
  capability: 'organizations' | 'contracts' | 'billing' | 'support' | 'security' | 'audit',
): Promise<PlatformAdminMembership> {
  const membership = await getPlatformAdminMembership(userId);

  if (!membership || !platformRoleHasCapability(membership.role, capability)) {
    throw new PlatformAdminError('platform_admin_required', 403);
  }

  await requirePlatformAdminAal2();
  return membership;
}
