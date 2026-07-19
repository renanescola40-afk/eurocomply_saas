import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { restoreOrganizationInvite } from '@/server/queries/invites';

const ATOMIC_MEMBER_REMOVAL_RPC = 'remove_organization_member_atomic';

const INVITATION_CANCELLATION_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 1000,
} as const;

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

async function enforceInvitationCancellationRateLimit(input: { organizationId: string; userId: string }) {
  const rateLimit = await checkDistributedRateLimit({
    key: `team.invite_cancel:${input.organizationId}:${input.userId}`,
    policy: 'team-management',
    userId: input.userId,
    organizationId: input.organizationId,
    route: 'server-action:team.invite_cancel',
    action: 'team_invite_cancel',
    limit: INVITATION_CANCELLATION_RATE_LIMIT.limit,
    windowMs: INVITATION_CANCELLATION_RATE_LIMIT.windowMs,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many invitation cancellation attempts. Please try again later.');
  }
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
  await enforceInvitationCancellationRateLimit({ organizationId: input.organizationId, userId: user.id });

  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('id,organization_id,email,role,token,invited_by,accepted_at,expires_at,created_at')
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

  const audit = await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: user.id,
    action: 'team.invite_cancelled',
    entityType: 'invitation',
    entityId: input.invitationId,
    metadata: { email: invitation.email, role: invitation.role },
  });

  if (!audit.persisted) {
    const restoration = await restoreOrganizationInvite({
      organizationId: input.organizationId,
      invitationId: input.invitationId,
      invitation,
    });

    if (!restoration.restored) {
      reportError(new Error('Invitation cancellation audit compensation failed'), {
        area: 'team_cancel_invitation_audit_compensation',
        organizationId: input.organizationId,
        invitationId: input.invitationId,
        providerCode: restoration.providerCode,
      });
    }

    throw actionError('Unable to cancel invitation.');
  }
}

export async function removeOrganizationMember(input: { organizationId: string; memberId: string }) {
  const user = await requireCurrentUser();
  await assertCurrentUserCan(input.organizationId, user.id, 'team:remove');
  await enforceMemberRemovalRateLimit({ organizationId: input.organizationId, userId: user.id });

  const supabase = createAdminClient();
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('*')
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

  const audit = await logAuditEvent({
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

  if (!audit.persisted) {
    const { error: rollbackError } = await supabase.from('organization_members').insert(member);

    if (rollbackError) {
      reportError(rollbackError, {
        area: 'team_remove_member_audit_rollback',
        organizationId: input.organizationId,
        memberId: input.memberId,
      });
    }

    throw actionError('Unable to remove member.');
  }
}
