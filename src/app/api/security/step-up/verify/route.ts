import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import {
  STEP_UP_MAX_AGE_MS,
  HIGH_RISK_ACTIONS,
  createStepUpTokenEnvelope,
  normalizeHighRiskAction,
  persistStepUpTokenRecord,
  recordStepUpAuditEvent,
} from '@/server/security/step-up';
import { STEP_UP_ACTION_PERMISSIONS, verifyStepUpProviderChallenge, type StepUpProviderRequestBody } from '@/server/security/step-up-provider';
import { getEffectiveStepUpProviderPolicy } from '@/server/security/step-up-settings';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

export const runtime = 'nodejs';

const STEP_UP_VERIFY_JSON_MAX_BYTES = 4 * 1024;

function auditFailureEvent(error: string) {
  if (error === 'step_up_expired') return 'step_up_expired' as const;
  if (error === 'step_up_scope_mismatch') return 'step_up_scope_mismatch' as const;
  return 'step_up_failed' as const;
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'authentication_required' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 403 });
  }

  const rateLimit = await checkDistributedRateLimit({
    policy: 'step-up-challenge',
    userId: user.id,
    organizationId: organization.id,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'step_up_verify',
    route: '/api/security/step-up/verify',
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const body = await readBoundedJsonRequest<StepUpProviderRequestBody>(request, {
    maxBytes: STEP_UP_VERIFY_JSON_MAX_BYTES,
  }).catch(() => null);
  const action = normalizeHighRiskAction(body?.action);

  if (!body || !action) {
    return noStoreJson(
      {
        error: 'invalid_step_up_action',
        message: 'A supported high-risk action is required before step-up can be verified.',
        supportedActions: HIGH_RISK_ACTIONS,
      },
      { status: 400 },
    );
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: STEP_UP_ACTION_PERMISSIONS[action],
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const providerPolicy = await getEffectiveStepUpProviderPolicy(organization.id);
  const verification = await verifyStepUpProviderChallenge({
    body,
    action,
    userId: user.id,
    organizationId: organization.id,
    policy: providerPolicy,
  });

  if (!verification.ok) {
    await recordStepUpAuditEvent({
      event: auditFailureEvent(verification.error),
      action,
      userId: user.id,
      organizationId: organization.id,
      reason: verification.error,
      verificationMethod: providerPolicy.mode,
    });

    return noStoreJson(
      {
        error: verification.error,
        message: verification.message,
        details: verification.details,
        requiredProvider: 'mfa_or_identity_provider_reauthentication',
      },
      { status: verification.status },
    );
  }

  const envelope = createStepUpTokenEnvelope({
    action,
    userId: user.id,
    organizationId: organization.id,
    verifiedAt: new Date(),
    verificationMethod: verification.method,
  });

  const persisted = await persistStepUpTokenRecord({
    token: envelope.token,
    payload: envelope.payload,
    metadata: {
      provider: verification.provider,
      aal: verification.aal ?? null,
      challengeNonce: verification.challengeNonce,
      policySource: providerPolicy.source,
    },
  });

  if (!persisted.ok) {
    await recordStepUpAuditEvent({
      event: 'step_up_failed',
      action,
      userId: user.id,
      organizationId: organization.id,
      reason: persisted.reason,
      nonce: envelope.payload.nonce,
      verificationMethod: verification.method,
    });

    return noStoreJson(
      {
        error: persisted.reason,
        message: 'Step-up provider verification succeeded, but token persistence is unavailable. Critical actions remain blocked.',
      },
      { status: 503 },
    );
  }

  await recordStepUpAuditEvent({
    event: 'step_up_verified',
    action,
    userId: user.id,
    organizationId: organization.id,
    nonce: envelope.payload.nonce,
    verificationMethod: verification.method,
  });

  return noStoreJson({
    token: envelope.token,
    tokenType: 'signed_hmac',
    action,
    organizationId: organization.id,
    expiresAt: envelope.payload.expiresAt,
    maxAgeMs: STEP_UP_MAX_AGE_MS,
    verification: {
      method: verification.method,
      provider: verification.provider,
      aal: verification.aal ?? null,
      policySource: providerPolicy.source,
    },
  });
}
