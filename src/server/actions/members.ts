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
const ATOMIC_MEMBER_REMOVAL_RPC = 'remove_organization_member_atomic';

type MemberRemovalResult = {
  outcome: 'removed' | 'last_owner' | 'state_changed' | 'not_found' | 'invalid_input';
  affected_member_id: string | null;
  affected_user_id: string | null;
  previous_role: string | null;
};

function firstRemovalResult(data: unknown): MemberRemovalResult | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const candidate = data[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  return candidate as MemberRemovalResult;
}

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

  const { data: cancelledInvitation, error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId)
    .is('accepted_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    failMemberAction(error, { area: 'team_cancel_invitation', organizationId: input.organizationId, invitationId: input.invitationId }, 'Unable to cancel invitation.');
  }

  if (!cancelledInvitation) {
    throw actionError('Invitation state changed before cancellation completed');
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

  const { data: removalData, error } = await supabase.rpc(ATOMIC_MEMBER_REMOVAL_RPC, {
    p_organization_id: input.organizationId,
    p_member_id: input.memberId,
    p_expected_user_id: member.user_id,
    p_expected_role: member.role,
  });

  if (error) {
    failMemberAction(error, { area: 'team_remove_member', organizationId: input.organizationId, memberId: input.memberId }, 'Unable to remove member.');
  }

  const removal = firstRemovalResult(removalData);
  if (!removal) {
    throw actionError('Unable to remove member.');
  }

  if (removal.outcome === 'not_found') {
    throw actionError('Member not found');
  }

  if (removal.outcome === 'last_owner') {
    throw actionError('Cannot remove the last organization owner');
  }

  if (removal.outcome === 'state_changed') {
    throw actionError('Member state changed before removal completed');
  }

  if (removal.outcome !== 'removed') {
    throw actionError('Unable to remove member.');
  }

  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: user.id,
    action: 'team.member_removed',
    entityType: 'organization_member',
    entityId: removal.affected_member_id ?? input.memberId,
    metadata: {
      removedUserId: removal.affected_user_id ?? member.user_id ?? null,
      role: removal.previous_role ?? member.role,
    },
  });
}
