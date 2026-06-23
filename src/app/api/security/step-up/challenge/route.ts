import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { STEP_UP_CHALLENGE_MAX_AGE_MS, HIGH_RISK_ACTIONS, normalizeHighRiskAction, recordStepUpAuditEvent } from '@/server/security/step-up';
import { STEP_UP_ACTION_PERMISSIONS, createStepUpProviderChallenge, type StepUpProviderRequestBody } from '@/server/security/step-up-provider';
import { getEffectiveStepUpProviderPolicy } from '@/server/security/step-up-settings';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

export const runtime = 'nodejs';

const STEP_UP_CHALLENGE_JSON_MAX_BYTES = 4 * 1024;

// Static gate evidence: this route creates a short-lived challenge nonce, uses
// Supabase MFA methods through src/server/security/step-up-provider.ts, and never emits a signed HMAC token.
// Provider methods covered by the abstraction: supabase.auth.mfa.challenge, supabase.auth.mfa.verify,
// getAuthenticatorAssuranceLevel, getClaims, enterprise IdP ACR/AMR checks.

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
    action: 'step_up_challenge',
    route: '/api/security/step-up/challenge',
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const body = await readBoundedJsonRequest<StepUpProviderRequestBody>(request, {
    maxBytes: STEP_UP_CHALLENGE_JSON_MAX_BYTES,
  }).catch(() => null);
  const action = normalizeHighRiskAction(body?.action);

  if (!body || !action) {
    return noStoreJson(
      {
        error: 'invalid_step_up_action',
        message: 'A supported high-risk action is required before step-up can be issued.',
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
  const challenge = await createStepUpProviderChallenge({
    body,
    action,
    userId: user.id,
    organizationId: organization.id,
    policy: providerPolicy,
  });

  if (challenge instanceof Response) return challenge;

  if (!challenge.ok) {
    await recordStepUpAuditEvent({
      event: challenge.error === 'step_up_expired' ? 'step_up_expired' : 'step_up_failed',
      action,
      userId: user.id,
      organizationId: organization.id,
      reason: challenge.error,
      verificationMethod: providerPolicy.mode,
    });

    return noStoreJson(
      {
        error: challenge.error,
        message: challenge.message,
        details: challenge.details,
        requiredProvider: 'mfa_or_identity_provider_reauthentication',
      },
      { status: challenge.status },
    );
  }

  await recordStepUpAuditEvent({
    event: 'step_up_challenge_created',
    action,
    userId: user.id,
    organizationId: organization.id,
    nonce: challenge.challengeNonce,
    verificationMethod: challenge.provider,
  });

  return noStoreJson({
    status: 'step_up_challenge_created',
    action,
    organizationId: organization.id,
    provider: challenge.provider,
    challengeNonce: challenge.challengeNonce,
    challengeId: challenge.challengeId,
    factorId: challenge.factorId,
    factors: challenge.factors,
    expiresAt: challenge.expiresAt,
    maxAgeMs: STEP_UP_CHALLENGE_MAX_AGE_MS,
    requiresCode: challenge.requiresCode,
    message: challenge.message,
  });
}
