import { createAdminClient } from '@/lib/supabase/admin';

export async function listOrganizationMembers(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[members] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load organization members.');
  }

  return data ?? [];
}

export async function listPendingInvitations(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('invitations')
    .select('id, organization_id, email, role, invited_by, expires_at, created_at')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[members] pending_invitations_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load pending invitations.');
  }

  return data ?? [];
}
