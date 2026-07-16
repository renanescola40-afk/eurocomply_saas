import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type PlatformAdminRole = 'owner' | 'sales_admin' | 'sales_rep' | 'support_admin';

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
  if (normalized === 'owner') return 'owner';
  if (normalized === 'sales_admin') return 'sales_admin';
  if (normalized === 'sales_rep') return 'sales_rep';
  if (normalized === 'support_admin') return 'support_admin';
  return null;
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
  allowedRoles: PlatformAdminRole[] = ['owner', 'sales_admin'],
): Promise<PlatformAdminMembership> {
  const membership = await getPlatformAdminMembership(userId);

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new PlatformAdminError('platform_admin_required', 403);
  }

  await requirePlatformAdminAal2();

  return membership;
}
