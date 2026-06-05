import { createAdminClient } from '@/lib/supabase/admin';

export async function getInvitationByToken(token: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('invitations')
    .select('id,email,role,organization_id,accepted_at,expires_at,organizations(name,slug)')
    .eq('token', token)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export function isInvitationExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;

  return new Date(expiresAt).getTime() < Date.now();
}

export function canAcceptInvitation(invitation: { accepted_at?: string | null; expires_at?: string | null } | null) {
  if (!invitation) return false;
  if (invitation.accepted_at) return false;

  return !isInvitationExpired(invitation.expires_at);
}
