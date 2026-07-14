import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createOrganizationInvite } from '@/server/queries/invites';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { isPlanAtLeast } from '@/server/queries/subscription';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import { requireStepUpForRequest } from '@/server/security/step-up';

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(['Admin', 'Editor', 'Visualizador']).default('Visualizador'),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const INVITE_JSON_MAX_BYTES = 4 * 1024;

function getInviteEntityId(invite: unknown) {
  if (!invite || typeof invite !== 'object' || !('id' in invite)) {
    return undefined;
  }

  const { id } = invite as { id?: unknown };
  return typeof id === 'string' ? id : undefined;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'Organization not found' }, { status: 404 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-invite:${organization.id}:${user.id}`,
        limit: RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
      },
    });

    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });

    if (!stepUp.ok) {
      return stepUp.response;
    }

    const payload = await readBoundedJsonRequest(request, { maxBytes: INVITE_JSON_MAX_BYTES }).catch(() => null);
    const parsed = inviteSchema.safeParse(payload);

    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_invite_payload' }, { status: 400 });
    }

    const entitlements = await getOrganizationEntitlements(organization.id);

    if (!entitlements.employeeInvites) {
      await createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'team_invite_blocked',
        entityType: 'team_invite',
        metadata: { reason: 'business_required', plan: entitlements.plan, role: permission.role },
      });

      return noStoreJson(
        { error: 'business_plan_required', message: 'Team invites require the Business plan or higher.' },
        { status: 402 },
      );
    }

    const { email, role } = parsed.data;

    if (role === 'Admin' && !isPlanAtLeast(entitlements.plan, 'enterprise')) {
      return noStoreJson(
        { error: 'enterprise_plan_required', message: 'Admin invitations require the Enterprise plan.' },
        { status: 402 },
      );
    }

    const result = await createOrganizationInvite({
      organizationId: organization.id,
      invitedBy: user.id,
      email,
      role,
    });

    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'team_invite_created',
      entityType: 'team_invite',
      entityId: getInviteEntityId(result.invite),
      metadata: {
        emailDomain: email.split('@')[1] ?? 'unknown',
        role,
        actorRole: permission.role,
        plan: entitlements.plan,
        persisted: result.persisted,
      },
    });

    const notification = await createNotification({
      organizationId: organization.id,
      userId: user.id,
      type: 'invite',
      message: `Convite de equipa enviado com permissão ${role}.`,
    });

    return noStoreJson({
      invite: result.invite,
      persisted: result.persisted,
      auditPersisted: audit.persisted,
      notificationPersisted: notification.persisted,
      plan: entitlements.plan,
    });
  } catch (error) {
    return secureApiError(error);
  }
}
