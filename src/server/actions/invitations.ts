import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from './audit';

const acceptInvitationSchema = z.object({
  token: z.string().min(24),
});

export async function acceptInvitation(input: unknown, userId: string, userEmail: string) {
  const payload = acceptInvitationSchema.parse(input);
  const supabase = createAdminClient();
  const normalizedEmail = userEmail.trim().toLowerCase();

  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', payload.token)
    .is('accepted_at', null)
    .maybeSingle();

  if (invitationError) throw invitationError;
  if (!invitation) throw new Error('Invitation not found or already accepted.');

  if (invitation.email !== normalizedEmail) {
    throw new Error('This invitation belongs to another email address.');
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation has expired.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .upsert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
    }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single();

  if (membershipError) throw membershipError;

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  if (updateError) throw updateError;

  await logAuditEvent({
    organizationId: invitation.organization_id,
    actorUserId: userId,
    action: 'member.invitation_accepted',
    entityType: 'organization_member',
    entityId: membership.id,
    metadata: { invitationId: invitation.id, email: normalizedEmail, role: invitation.role },
  });

  return membership;
}
