import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const cancelInvitationSchema = z.object({
  invitationId: z.string().trim().min(1).max(128),
});

type OrganizationInviteRecord = {
  id: string;
  email: string | null;
  role: string | null;
  organization_id: string;
  status: string;
};

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const TEAM_ACTION_JSON_MAX_BYTES = 4 * 1024;

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `team-invitation-cancel:${user.id}:${getClientIp(request)}`,
    limit: RATE_LIMIT_MAX_ATTEMPTS,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (!rateLimit.allowed) {
    return noStoreJson(
      { error: rateLimit.reason ? 'security_control_unavailable' : 'Too many team invitation cancellation attempts. Please wait before trying again.' },
      {
        status: rateLimit.reason ? 503 : 429,
        headers: {
          'Retry-After': String(Math.max(1, rateLimit.retryAfterSeconds)),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    );
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_team',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const stepUp = await requireStepUpForRequest({
    request,
    action: 'manage_team',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const payload = await readBoundedJsonRequest(request, { maxBytes: TEAM_ACTION_JSON_MAX_BYTES }).catch(() => null);
  const parsed = cancelInvitationSchema.safeParse(payload);

  if (!parsed.success) {
    return noStoreJson({ error: 'invalid_invitation_payload' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: invitationData, error: invitationError } = await supabase
    .from('organization_invites')
    .select('id,email,role,organization_id,status')
    .eq('id', parsed.data.invitationId)
    .eq('organization_id', organization.id)
    .eq('status', 'pending')
    .maybeSingle();
  const invitation = invitationData as OrganizationInviteRecord | null;

  if (invitationError) {
    return noStoreJson({ error: 'invitation_lookup_failed' }, { status: 503 });
  }

  if (!invitation) {
    return noStoreJson({ error: 'invitation_not_pending' }, { status: 404 });
  }

  const { error } = await supabase
    .from('organization_invites')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.invitationId)
    .eq('organization_id', organization.id)
    .eq('status', 'pending');

  if (error) {
    return noStoreJson({ error: 'invitation_cancel_failed' }, { status: 503 });
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'team_invitation_cancelled',
    entityType: 'organization_invite',
    entityId: parsed.data.invitationId,
    metadata: {
      role: invitation.role ?? 'unknown',
      actorRole: permission.role,
      stepUpAction: 'manage_team',
    },
  });

  return noStoreJson({ cancelled: true, auditPersisted: audit.persisted, stepUp: publicStepUpSummary(stepUp.assessment) });
}
