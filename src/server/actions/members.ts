import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';

const ATOMIC_MEMBER_REMOVAL_RPC = 'remove_organization_member_atomic';

const MEMBER_REMOVAL_RATE_LIMIT = {
  limit: 10,
  windowMs: 60 * 1000,
} as const;

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

function actionError(message: string) {
  return new Error(message);
}

function failMemberAction(error: unknown, context: Record<string, unknown>, message: string): never {
  reportError(error, context);
  throw actionError(message);
}

async function enforceMemberRemovalRateLimit(input: { organizationId: string; userId: string }) {
  const rateLimit = await checkDistributedRateLimit({
    key: `team.member_remove:${input.organizationId}:${input.userId}`,
    policy: 'team-management',
    userId: input.userId,
    organizationId: input.organizationId,
    route: 'server-action:team.member_remove',
    action: 'team_member_remove',
    limit: MEMBER_REMOVAL_RATE_LIMIT.limit,
    windowMs: MEMBER_REMOVAL_RATE_LIMIT.windowMs,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many member removal attempts. Please try again later.');
  }
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
  await enforceMemberRemovalRateLimit({ organizationId: input.organizationId, userId: user.id });

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
