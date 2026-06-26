import { randomUUID } from 'crypto';

import { sendEmail } from '@/lib/email/client';
import { invitationEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteMemberSchema, type InviteMemberInput } from '@/lib/validation/organization';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 60 * 60 * 1000;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function inviteOrganizationMember(input: InviteMemberInput, invitedByUserId: string) {
  const payload = inviteMemberSchema.parse(input);
  const context = { area: 'member_invitation', organizationId: payload.organizationId, userId: invitedByUserId };

  await assertCurrentUserCan(payload.organizationId, invitedByUserId, 'team:invite');

  const rateLimit = await checkDistributedRateLimit({
    key: `invite:${payload.organizationId}:${invitedByUserId}`,
    limit: INVITE_LIMIT,
    windowMs: INVITE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many invitations sent. Please try again later.');
    reportError(error, context);
    throw error;
  }

  const supabase = createAdminClient();
  const token = randomUUID();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: payload.organizationId,
      email: payload.email.toLowerCase(),
      role: payload.role,
      token,
      invited_by: invitedByUserId,
    })
    .select('*, organizations(name)')
    .single();

  if (error) {
    reportError(error, { ...context, role: payload.role });
    throw new Error(error.message);
  }

  const organizationName = data.organizations?.name ?? 'your organization';
  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const email = invitationEmail({
    organizationName,
    role: payload.role,
    inviteUrl,
  });

  try {
    await sendEmail({
      to: payload.email.toLowerCase(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      template: email.template,
      organizationId: payload.organizationId,
      userId: invitedByUserId,
      metadata: {
        source: 'member_invitation_action',
        invitationId: data.id,
        role: payload.role,
      },
    });
  } catch (emailError) {
    reportError(emailError, { ...context, area: 'member_invitation_email', invitationId: data.id });
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: invitedByUserId,
    action: 'team.invite_created',
    entityType: 'invitation',
    entityId: data.id,
    metadata: { email: payload.email.toLowerCase(), role: payload.role, emailAttempted: true },
  });

  return data;
}

export async function cancelOrganizationInvitation(input: { organizationId: string; invitationId: string }, actorUserId: string) {
  await assertCurrentUserCan(input.organizationId, actorUserId, 'team:remove');

  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('id,email,role,organization_id,accepted_at')
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (invitationError) {
    reportError(invitationError, { area: 'team_cancel_invitation_lookup', organizationId: input.organizationId, invitationId: input.invitationId });
    throw new Error(invitationError.message);
  }

  if (!invitation || invitation.accepted_at) {
    throw new Error('Invitation is no longer pending');
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId)
    .is('accepted_at', null);

  if (error) {
    reportError(error, { area: 'team_cancel_invitation', organizationId: input.organizationId, invitationId: input.invitationId });
    throw new Error(error.message);
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId,
    action: 'team.invite_cancelled',
    entityType: 'invitation',
    entityId: input.invitationId,
    metadata: { email: invitation.email, role: invitation.role },
  });
}

export async function removeOrganizationMember(input: { organizationId: string; memberId: string }, actorUserId: string) {
  await assertCurrentUserCan(input.organizationId, actorUserId, 'team:remove');

  const supabase = createAdminClient();
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('id,user_id,role,organization_id')
    .eq('id', input.memberId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (memberError) {
    reportError(memberError, { area: 'team_remove_member_lookup', organizationId: input.organizationId, memberId: input.memberId });
    throw new Error(memberError.message);
  }

  if (!member) {
    throw new Error('Member not found');
  }

  if (member.user_id === actorUserId) {
    throw new Error('You cannot remove your own access from here');
  }

  if (member.role === 'owner') {
    const { count, error: ownerCountError } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId)
      .eq('role', 'owner');

    if (ownerCountError) {
      reportError(ownerCountError, { area: 'team_owner_count', organizationId: input.organizationId });
      throw new Error(ownerCountError.message);
    }

    if ((count ?? 0) <= 1) {
      throw new Error('Cannot remove the last organization owner');
    }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', input.memberId)
    .eq('organization_id', input.organizationId);

  if (error) {
    reportError(error, { area: 'team_remove_member', organizationId: input.organizationId, memberId: input.memberId });
    throw new Error(error.message);
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId,
    action: 'team.member_removed',
    entityType: 'organization_member',
    entityId: input.memberId,
    metadata: { removedUserId: member.user_id, role: member.role },
  });
}
