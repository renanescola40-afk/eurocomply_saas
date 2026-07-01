import { createAdminClient } from '@/lib/supabase/admin';

export type PlatformAdminRole = 'owner' | 'sales_admin' | 'sales_rep' | 'support_admin';

export type PlatformAdminMembership = {
  userId: string;
  role: PlatformAdminRole;
  enabled: boolean;
};

export class PlatformAdminError extends Error {
  status: 403 | 503;
  code: 'platform_admin_required' | 'platform_admin_check_failed';

  constructor(code: PlatformAdminError['code'], status: PlatformAdminError['status']) {
    super(code);
    this.name = 'PlatformAdminError';
    this.code = code;
    this.status = status;
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
