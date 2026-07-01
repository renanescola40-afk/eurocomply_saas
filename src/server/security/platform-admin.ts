import { createAdminClient } from '@/lib/supabase/admin';

export type PlatformAdminRole = 'owner' | 'sales_admin' | 'sales_rep' | 'support_admin';

export type PlatformAdminMembership = {
  userId: string;
  role: PlatformAdminRole;
  enabled: boolean;
};

export function normalizePlatformAdminRole(role: string | null | undefined): PlatformAdminRole | null {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'sales_admin') return 'sales_admin';
  if (normalized === 'sales_rep') return 'sales_rep';
  if (normalized === 'support_admin') return 'support_admin';
  return null;
}
