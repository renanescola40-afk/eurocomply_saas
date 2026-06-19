import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const cancelInvitationSchema = z.object({
  invitationId: z.string().trim().min(1).max(128),
});

const TEAM_ACTION_JSON_MAX_BYTES = 4 * 1024;

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
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
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('id,email,role,organization_id,accepted_at')
    .eq('id', parsed.data.invitationId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (invitationError) {
    return noStoreJson({ error: 'invitation_lookup_failed' }, { status: 503 });
  }

  if (!invitation || invitation.accepted_at) {
    return noStoreJson({ error: 'invitation_not_pending' }, { status: 404 });
  }

  const { error } = await supabase
    .from('invitations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', parsed.data.invitationId)
    .eq('organization_id', organization.id)
    .is('accepted_at', null);

  if (error) {
    return noStoreJson({ error: 'invitation_cancel_failed' }, { status: 503 });
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'team_invitation_cancelled',
    entityType: 'invitation',
    entityId: parsed.data.invitationId,
    metadata: {
      role: invitation.role,
      actorRole: permission.role,
      stepUpAction: 'manage_team',
    },
  });

  return noStoreJson({ cancelled: true, auditPersisted: audit.persisted, stepUp: publicStepUpSummary(stepUp.assessment) });
}
