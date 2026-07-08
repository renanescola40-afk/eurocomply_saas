import { randomUUID } from 'crypto';

import { sendEmail } from '@/lib/email/client';
import { invitationEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteMemberSchema, type InviteMemberInput } from '@/lib/validation/organization';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 60 * 60 * 1000;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function actionError(message: string) {
  return new Error(message);
}

function failMemberAction(error: unknown, context: Record<string, unknown>, message: string): never {
  reportError(error, context);
  throw actionError(message);
}

async function enforceInviteRateLimit(organizationId: string, userId: string) {
  const rateLimit = await checkDistributedRateLimit({
    key: `invite:${organizationId}:${userId}`,
    policy: 'general-api',
    userId,
    organizationId,
    route: 'server-action:team.invite',
    action: 'team.invite',
    limit: INVITE_LIMIT,
    windowMs: INVITE_WINDOW_MS,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many invitations sent. Please try again later.');
  }
}

export async function inviteOrganizationMember(input: InviteMemberInput) {
  const user = await requireCurrentUser();
  const payload = inviteMemberSchema.parse(input);
  const context = { area: 'member_invitation', organizationId: payload.organizationId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'team:invite');
  await enforceInviteRateLimit(payload.organizationId, user.id);

  const supabase = createAdminClient();
  const token = randomUUID();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: payload.organizationId,
      email: payload.email.toLowerCase(),
      role: payload.role,
      token,
      invited_by: user.id,
    })
    .select('*, organizations(name)')
    .single();

  if (error) {
    failMemberAction(error, { ...context, role: payload.role }, 'Unable to create invitation.');
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
      userId: user.id,
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
    actorUserId: user.id,
    action: 'team.invite_created',
    entityType: 'invitation',
    entityId: data.id,
    metadata: { email: payload.email.toLowerCase(), role: payload.role, emailAttempted: true },
  });

  return data;
}

export async function cancelOrganizationInvitation(input: { organizationId: string; invitationId: string }) {
  const user = await requireCurrentUser();
  await assertCurrentUserCan(input.organizationId, user.id, 'team:remove');

  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('id,email,role,organization_id,accepted_at')
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (invitationError) {
    failMemberAction(invitationError, { area: 'team_cancel_invitation_lookup', organizationId: input.organizationId, invitationId: input.invitationId }, 'Unable to load invitation.');
  }

  if (!invitation || invitation.accepted_at) {
    throw actionError('Invitation is no longer pending');
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId)
    .is('accepted_at', null);

  if (error) {
    failMemberAction(error, { area: 'team_cancel_invitation', organizationId: input.organizationId, invitationId: input.invitationId }, 'Unable to cancel invitation.');
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: user.id,
    action: 'team.invite_cancelled',
    entityType: 'invitation',
    entityId: input.invitationId,
    metadata: { email: invitation.email, role: invitation.role },
  });
}

export async function removeOrganizationMember(input: { organizationId: string; memberId: string }) {
  const user = await requireCurrentUser();
  await assertCurrentUserCan(input.organizationId, user.id, 'team:remove');

  const supabase = createAdminClient();
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('id,user_id,role,organization_id')
    .eq('id', input.memberId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (memberError) {
    failMemberAction(memberError, { area: 'team_remove_member_lookup', organizationId: input.organizationId, memberId: input.memberId }, 'Unable to load member.');
  }

  if (!member) {
    throw actionError('Member not found');
  }

  if (member.user_id === user.id) {
    throw actionError('You cannot remove your own access from here');
  }

  if (member.role === 'owner') {
    const { count, error: ownerCountError } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId)
      .eq('role', 'owner');

    if (ownerCountError) {
      failMemberAction(ownerCountError, { area: 'team_owner_count', organizationId: input.organizationId }, 'Unable to validate organization owners.');
    }

    if ((count ?? 0) <= 1) {
      throw actionError('Cannot remove the last organization owner');
    }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', input.memberId)
    .eq('organization_id', input.organizationId);

  if (error) {
    failMemberAction(error, { area: 'team_remove_member', organizationId: input.organizationId, memberId: input.memberId }, 'Unable to remove member.');
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: user.id,
    action: 'team.member_removed',
    entityType: 'organization_member',
    entityId: input.memberId,
    metadata: { removedUserId: member.user_id ?? null, role: member.role },
  });
}
