import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { restoreOrganizationInvite } from '@/server/queries/invites';

const INVITATION_CANCELLATION_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 1000,
} as const;

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

// Legacy Server Action is intentionally disabled: it cannot prove Step-Up
// nor atomically persist signed removal audit and FK effects. Use the
// /api/team/members/remove route with verified Step-Up instead.
export async function removeOrganizationMember(_input: { organizationId: string; memberId: string }) {
  throw actionError('Member removal requires the step-up protected API route.');
}
