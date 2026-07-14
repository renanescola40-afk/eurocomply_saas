import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
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

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
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
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-invitation-cancel:${user.id}:${getClientIp(request)}`,
        limit: RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
      },
    });

    if (mutationDenied) return mutationDenied;

    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

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

    const { data: revokedInvitation, error } = await supabase
      .from('organization_invites')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', parsed.data.invitationId)
      .eq('organization_id', organization.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      return noStoreJson({ error: 'invitation_cancel_failed' }, { status: 503 });
    }

    if (!revokedInvitation) {
      return noStoreJson({ error: 'invitation_state_changed' }, { status: 409 });
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
  } catch (error) {
    return secureApiError(error);
  }
}
