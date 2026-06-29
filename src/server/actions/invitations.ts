import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { reportError } from '@/lib/observability/report-error';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

const acceptInvitationSchema = z.object({
  token: z.string().min(24),
});

function actionError(message: string) {
  return new Error(message);
}

export async function acceptInvitation(input: unknown) {
  const user = await requireCurrentUser();
  const payload = acceptInvitationSchema.parse(input);
  const supabase = createAdminClient();
  const normalizedEmail = user.email?.trim().toLowerCase() ?? '';
  const context = { area: 'invitation_accept', userId: user.id };

  if (!normalizedEmail) {
    throw actionError('Authenticated email is required to accept this invitation.');
  }

  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', payload.token)
    .is('accepted_at', null)
    .maybeSingle();

  if (invitationError) {
    reportError(invitationError, context);
    throw actionError('Unable to accept invitation.');
  }

  if (!invitation) throw actionError('Invitation not found or already accepted.');

  if (invitation.email !== normalizedEmail) {
    throw actionError('This invitation belongs to another email address.');
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw actionError('Invitation has expired.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .upsert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single();

  if (membershipError) {
    reportError(membershipError, { ...context, organizationId: invitation.organization_id });
    throw actionError('Unable to accept invitation.');
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  if (updateError) {
    reportError(updateError, { ...context, organizationId: invitation.organization_id, invitationId: invitation.id });
    throw actionError('Unable to accept invitation.');
  }

  await logAuditEvent({
    organizationId: invitation.organization_id,
    actorUserId: user.id,
    action: 'member.invitation_accepted',
    entityType: 'organization_member',
    entityId: membership.id,
    metadata: { invitationId: invitation.id, email: normalizedEmail, role: invitation.role },
  });

  return membership;
}
