import { z } from 'zod';

import { sendEmail } from '@/lib/email/client';
import { localizedInvitationEmail } from '@/lib/email/localized-invitation';
import { reportError } from '@/lib/observability/report-error';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import {
  createOrganizationInvite,
  deleteOrganizationInvite,
  OrganizationInviteError,
} from '@/server/queries/invites';
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
  seatType: z.enum(['full', 'participant', 'viewer']).optional(),
  locale: z.enum(['en', 'pt', 'es', 'fr', 'it', 'de']).default('en'),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const INVITE_JSON_MAX_BYTES = 4 * 1024;

function getAppUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configuredAppUrl || 'http://localhost:3000').replace(/\/$/, '');
}

function getInviteEntityId(invite: unknown) {
  if (!invite || typeof invite !== 'object' || !('id' in invite)) return undefined;
  const { id } = invite as { id?: unknown };
  return typeof id === 'string' ? id : undefined;
}

function inviteCapacityResponse(error: OrganizationInviteError) {
  if (error.code === 'member_limit_reached' || error.code === 'seat_limit_reached') {
    return noStoreJson({ error: 'organization_seat_limit_reached', message: 'The organization has no available contracted seat for this invitation.' }, { status: 409 });
  }
  if (error.code === 'admin_limit_reached') {
    return noStoreJson({ error: 'organization_admin_limit_reached', message: 'The organization has reached its contracted administrator limit.' }, { status: 409 });
  }
  if (error.code === 'contract_missing' || error.code === 'contract_not_active' || error.code === 'entitlements_missing') {
    return noStoreJson({ error: 'organization_contract_not_accepting_members', message: 'The organization contract is not currently accepting new members.' }, { status: 403 });
  }
  if (error.code === 'already_accepted') return noStoreJson({ error: 'user_already_joined_organization' }, { status: 409 });
  if (error.code === 'invalid_invitation') return noStoreJson({ error: 'invalid_invite_payload' }, { status: 400 });
  return noStoreJson({ error: 'invitation_persistence_unavailable' }, { status: 503 });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'Organization not found' }, { status: 404 });

    const permission = await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-invite:${organization.id}:${user.id}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'team_invite_create',
        route: '/api/team/invites',
        limit: RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: RATE_LIMIT_WINDOW_MS,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({ request, action: 'manage_team', userId: user.id, organizationId: organization.id });
    if (!stepUp.ok) return stepUp.response;

    const payload = await readBoundedJsonRequest(request, { maxBytes: INVITE_JSON_MAX_BYTES }).catch(() => null);
    const parsed = inviteSchema.safeParse(payload);
    if (!parsed.success) return noStoreJson({ error: 'invalid_invite_payload' }, { status: 400 });

    const entitlements = await getOrganizationEntitlements(organization.id);
    if (!entitlements.employeeInvites) {
      await createAuditEvent({ organizationId: organization.id, actorUserId: user.id, action: 'team_invite_blocked', entityType: 'team_invite', metadata: { reason: 'business_required', plan: entitlements.plan, role: permission.role } });
      return noStoreJson({ error: 'business_plan_required', message: 'Team invites require the Business plan or higher.' }, { status: 402 });
    }

    const { email, role, seatType, locale } = parsed.data;
    if (role === 'Admin' && !isPlanAtLeast(entitlements.plan, 'enterprise')) {
      return noStoreJson({ error: 'enterprise_plan_required', message: 'Admin invitations require the Enterprise plan.' }, { status: 402 });
    }

    const result = await createOrganizationInvite({ organizationId: organization.id, invitedBy: user.id, email, role, seatType });
    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'team_invite_created',
      entityType: 'invitation',
      entityId: getInviteEntityId(result.invite),
      metadata: {
        emailDomain: email.split('@')[1] ?? 'unknown',
        role,
        seatType: result.invite.seat_type,
        actorRole: permission.role,
        plan: entitlements.plan,
        persisted: result.persisted,
        emailDeliveryPending: true,
        locale,
      },
    });

    if (!audit.persisted) {
      try {
        await deleteOrganizationInvite({ organizationId: organization.id, invitationId: result.invite.id });
      } catch (compensationError) {
        reportError(compensationError, { area: 'team_invitation_audit_compensation', organizationId: organization.id, invitationId: result.invite.id });
      }
      return noStoreJson({ error: 'team_invite_audit_unavailable' }, { status: 503 });
    }

    const inviteUrl = `${getAppUrl()}/${locale}/invite/${encodeURIComponent(result.token)}`;
    const builtEmail = localizedInvitationEmail({ organizationName: result.organizationName, role: result.invite.role, inviteUrl, locale });

    try {
      const delivery = await sendEmail({
        to: result.invite.email,
        subject: builtEmail.subject,
        html: builtEmail.html,
        text: builtEmail.text,
        template: builtEmail.template,
        organizationId: organization.id,
        userId: user.id,
        idempotencyKey: `team-invite:${result.invite.id}:${result.tokenFingerprint}`,
        metadata: { source: 'team_invites_api', invitationId: result.invite.id, role: result.invite.role, seatType: result.invite.seat_type, locale },
      });
      if (!delivery.sent) throw new Error(`Invitation email delivery was not confirmed (${delivery.status})`);
    } catch (emailError) {
      reportError(emailError, { area: 'team_invitation_delivery', organizationId: organization.id, invitationId: result.invite.id, emailDomain: email.split('@')[1] ?? 'unknown' });

      let inviteRevoked = false;
      try {
        await deleteOrganizationInvite({ organizationId: organization.id, invitationId: result.invite.id });
        inviteRevoked = true;
      } catch (compensationError) {
        reportError(compensationError, { area: 'team_invitation_delivery_compensation', organizationId: organization.id, invitationId: result.invite.id });
      }

      const failedAudit = await createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'team_invite_delivery_failed',
        entityType: 'invitation',
        entityId: result.invite.id,
        metadata: { emailDomain: email.split('@')[1] ?? 'unknown', role: result.invite.role, seatType: result.invite.seat_type, actorRole: permission.role, inviteRevoked, locale },
      });
      return noStoreJson({ error: 'invitation_delivery_failed', persisted: !inviteRevoked, auditPersisted: failedAudit.persisted }, { status: 503 });
    }

    const notification = await createNotification({
      organizationId: organization.id,
      userId: user.id,
      type: 'invite',
      message: `Team invitation sent with ${role} permission.`,
    });

    return noStoreJson({ invite: result.invite, persisted: result.persisted, auditPersisted: true, notificationPersisted: notification.persisted, plan: entitlements.plan, locale });
  } catch (error) {
    if (error instanceof OrganizationInviteError) return inviteCapacityResponse(error);
    return secureApiError(error);
  }
}
