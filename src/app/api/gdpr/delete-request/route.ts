import { NextRequest } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { buildGdprDeleteAuditMetadata, buildGdprDeletePlan, GDPR_DELETE_CONFIRMATION, normalizeDeleteReason, validateDeleteConfirmation } from '@/server/privacy/gdpr';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

const DELETE_REQUEST_JSON_MAX_BYTES = 4 * 1024;

export async function POST(request: NextRequest) {
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

  const requestContext = buildAuditRequestContextFromRequest(request);

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_settings',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    policy: 'gdpr-delete',
    userId: user.id,
    organizationId: organization.id,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'gdpr_delete',
    route: '/api/gdpr/delete-request',
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const entitlementCheck = await assertGdprSelfServiceEnabled(organization.id);

  if (!entitlementCheck.ok) {
    return upgradeRequiredResponse({
      error: entitlementCheck.error,
      message: entitlementCheck.message,
      plan: entitlementCheck.entitlements.plan,
      requiredPlan: 'professional',
      entitlements: entitlementCheck.entitlements,
    }, entitlementCheck.status);
  }

  const stepUp = await requireStepUpForRequest({
    request,
    action: 'gdpr_delete',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  let body: Record<string, unknown>;

  try {
    body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: DELETE_REQUEST_JSON_MAX_BYTES,
    });
  } catch {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'gdpr_delete_denied',
      entityType: 'organization',
      entityId: organization.id,
      metadata: {
        reason: 'invalid_delete_request_payload',
        role: permission.role,
      },
      requestContext,
    });

    return noStoreJson({
      error: 'invalid_gdpr_delete_payload',
      message: 'Request body must be valid JSON within the allowed size limit.',
    }, { status: 400 });
  }

  if (!validateDeleteConfirmation(body)) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'gdpr_delete_denied',
      entityType: 'organization',
      entityId: organization.id,
      metadata: {
        reason: 'missing_delete_confirmation',
        requiredConfirmation: GDPR_DELETE_CONFIRMATION,
        role: permission.role,
      },
      requestContext,
    });

    return noStoreJson({
      error: 'delete_confirmation_required',
      message: `Send confirmation exactly as: ${GDPR_DELETE_CONFIRMATION}`,
      requiredConfirmation: GDPR_DELETE_CONFIRMATION,
    }, { status: 400 });
  }

  const reason = normalizeDeleteReason(body.reason);
  const deletePlan = buildGdprDeletePlan();

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_delete_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: buildGdprDeleteAuditMetadata({
      reason,
      role: permission.role,
      plan: entitlementCheck.entitlements.plan,
      deletePlan,
      stepUp: stepUp.assessment,
    }),
    requestContext,
  });

  if (!audit.persisted) {
    reportError(new Error('GDPR deletion request audit persistence failed'), {
      area: 'gdpr_delete_request_audit',
      organizationId: organization.id,
      userId: user.id,
      reason: audit.reason,
    });

    return noStoreJson({
      error: 'gdpr_delete_request_audit_unavailable',
      message: 'The deletion request could not be recorded safely. Please try again later.',
    }, { status: 503 });
  }

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Pedido GDPR recebido e enviado para revisão.',
  });

  return noStoreJson({
    ...deletePlan,
    message: 'Request received. A compliance administrator must review retention, legal hold, billing and audit requirements before completion.',
    stepUp: publicStepUpSummary(stepUp.assessment),
  });
}
