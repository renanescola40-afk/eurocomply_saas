import { NextRequest } from 'next/server';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
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

  const rateLimit = await checkDistributedRateLimit({
    key: `gdpr:delete-request:${organization.id}:${user.id}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
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

  const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
    maxBytes: DELETE_REQUEST_JSON_MAX_BYTES,
  }).catch(() => ({}));
  const reason = typeof body.reason === 'string' && body.reason.trim().length > 0 ? body.reason.trim().slice(0, 500) : 'No reason provided';

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_delete_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: {
      reason,
      status: 'pending_review',
      plan: entitlementCheck.entitlements.plan,
      stepUpAction: stepUp.assessment.action,
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      stepUpTokenType: 'signed_hmac',
    },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Pedido de apagamento GDPR recebido e enviado para revisão.',
  });

  return noStoreJson({
    status: 'pending_review',
    message: 'Deletion request received. A compliance administrator must review retention, legal hold, billing and audit requirements before deletion.',
    stepUp: publicStepUpSummary(stepUp.assessment),
  });
}
