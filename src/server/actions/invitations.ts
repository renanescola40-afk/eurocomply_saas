import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { reportError } from '@/lib/observability/report-error';
import { requireCurrentUser } from '@/server/queries/auth';
import { enforceServerActionRateLimit } from '@/server/security/server-action-rate-limit';
import { logAuditEvent } from './audit';

const acceptInvitationSchema = z.object({
  token: z.string().min(24),
});

const ATOMIC_INVITATION_ACCEPTANCE_RPC = 'accept_organization_invitation_atomic';

type InvitationAcceptanceResult = {
  outcome: string;
  invitation_id: string | null;
  organization_id: string | null;
  membership_id: string | null;
  applied_role: string | null;
};

function firstAcceptanceResult(data: unknown): InvitationAcceptanceResult | null {
  if (Array.isArray(data)) return (data[0] as InvitationAcceptanceResult | undefined) ?? null;
  if (data && typeof data === 'object') return data as InvitationAcceptanceResult;
  return null;
}

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

  await enforceServerActionRateLimit({
    key: `team.invitation_accept:${user.id}`,
    policy: 'team-management',
    userId: user.id,
    route: 'server-action:acceptInvitation',
    action: 'team.invitation_accept',
    limit: 5,
    windowMs: 10 * 60 * 1000,
    failureMode: 'fail-closed',
    rateLimitedMessage: 'Too many invitation acceptance attempts. Please try again later.',
    unavailableMessage: 'Invitation security is temporarily unavailable. Please try again later.',
  });

  const { data, error } = await supabase.rpc(ATOMIC_INVITATION_ACCEPTANCE_RPC, {
    p_token: payload.token,
    p_user_id: user.id,
    p_email: normalizedEmail,
  });

  if (error) {
    reportError(error, context);
    throw actionError('Unable to accept invitation.');
  }

  const acceptance = firstAcceptanceResult(data);
  if (!acceptance) throw actionError('Unable to accept invitation.');
  if (acceptance.outcome === 'not_found' || acceptance.outcome === 'already_accepted') {
    throw actionError('Invitation not found or already accepted.');
  }
  if (acceptance.outcome === 'email_mismatch') throw actionError('This invitation belongs to another email address.');
  if (acceptance.outcome === 'expired') throw actionError('Invitation has expired.');
  if (acceptance.outcome !== 'accepted' || !acceptance.organization_id || !acceptance.membership_id) {
    throw actionError('Unable to accept invitation.');
  }

  await logAuditEvent({
    organizationId: acceptance.organization_id,
    actorUserId: user.id,
    action: 'member.invitation_accepted',
    entityType: 'organization_member',
    entityId: acceptance.membership_id,
    metadata: {
      invitationId: acceptance.invitation_id,
      email: normalizedEmail,
      role: acceptance.applied_role,
    },
  });

  return {
    id: acceptance.membership_id,
    organization_id: acceptance.organization_id,
    user_id: user.id,
    role: acceptance.applied_role,
  };
}
