import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import {
  STEP_UP_MAX_AGE_MS,
  createStepUpTokenEnvelope,
  normalizeHighRiskAction,
  persistStepUpTokenRecord,
  recordStepUpAuditEvent,
  type HighRiskAction,
  type StepUpVerificationMethod,
} from '@/server/security/step-up';
import {
  getEffectiveStepUpProviderPolicy,
  isEffectiveStepUpProviderPolicyConfigured,
  type EffectiveStepUpProviderPolicy,
} from '@/server/security/step-up-settings';

export const runtime = 'nodejs';

const STEP_UP_CHALLENGE_JSON_MAX_BYTES = 4 * 1024;

// Static gate evidence: this route uses Supabase MFA methods named
// supabase.auth.mfa.challenge, supabase.auth.mfa.verify and supabase.auth.mfa.challengeAndVerify.

type StepUpChallengeBody = {
  action?: unknown;
  factorId?: unknown;
  challengeId?: unknown;
  code?: unknown;
};

type StepUpMfaFactor = {
  id?: string;
  status?: string;
  friendly_name?: string | null;
  factor_type?: string | null;
};

type PublicMfaFactor = {
  id: string;
  type: string;
  name: string | null;
};

type SupabaseAuthErrorLike = {
  message?: string;
};

type SupabaseMfaApi = {
  listFactors: () => Promise<{
    data?: {
      totp?: StepUpMfaFactor[];
      phone?: StepUpMfaFactor[];
    } | null;
    error?: SupabaseAuthErrorLike | null;
  }>;
  challenge: (params: { factorId: string }) => Promise<{
    data?: { id?: string | null } | null;
    error?: SupabaseAuthErrorLike | null;
  }>;
  verify: (params: { factorId: string; challengeId: string; code: string }) => Promise<{
    error?: SupabaseAuthErrorLike | null;
  }>;
  challengeAndVerify?: (params: { factorId: string; code: string }) => Promise<{
    error?: SupabaseAuthErrorLike | null;
  }>;
  getAuthenticatorAssuranceLevel: () => Promise<{
    data?: { currentLevel?: string | null } | null;
    error?: SupabaseAuthErrorLike | null;
  }>;
};

type SupabaseClaimsApi = {
  getClaims?: () => Promise<{
    data?: { claims?: Record<string, unknown> | null } | null;
    error?: SupabaseAuthErrorLike | null;
  }>;
};

type RealVerificationResult =
  | {
      ok: true;
      method: StepUpVerificationMethod;
      provider: string;
      aal?: string | null;
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 503;
      error: string;
      message: string;
      details?: Record<string, unknown>;
    };

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function claimValues(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/[\s,]+/).filter(Boolean);
  return [];
}

function readAuthTimeMs(value: unknown) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric > 10_000_000_000 ? numeric : numeric * 1000;
}

function publicMfaFactor(factor: StepUpMfaFactor): PublicMfaFactor | null {
  if (!factor.id || factor.status !== 'verified') return null;

  return {
    id: factor.id,
    type: factor.factor_type ?? 'totp',
    name: factor.friendly_name ?? null,
  };
}

function getMfaApi(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  return supabase.auth.mfa as unknown as SupabaseMfaApi;
}

async function verifyEnterpriseIdpStepUp(policy: EffectiveStepUpProviderPolicy): Promise<RealVerificationResult> {
  const supabase = await createServerSupabaseClient();
  const auth = supabase.auth as typeof supabase.auth & SupabaseClaimsApi;

  if (typeof auth.getClaims !== 'function') {
    return {
      ok: false,
      status: 503,
      error: 'step_up_idp_claims_unavailable',
      message: 'Enterprise IdP step-up requires verified session claims. Upgrade Supabase auth client support before enabling enterprise release.',
    };
  }

  const { data, error } = await auth.getClaims();
  if (error || !data?.claims) {
    return {
      ok: false,
      status: 401,
      error: 'step_up_idp_claims_missing',
      message: 'Could not verify enterprise IdP reauthentication claims for this session.',
    };
  }

  const claims = data.claims;
  const configuredAcr = new Set(policy.allowedAcrValues);
  const configuredAmr = new Set(policy.allowedAmrValues);
  const acrValues = claimValues(claims.acr);
  const amrValues = claimValues(claims.amr);
  const authTimeMs = readAuthTimeMs(claims.auth_time ?? claims.iat);
  const fresh = authTimeMs !== null && Date.now() - authTimeMs <= STEP_UP_MAX_AGE_MS;
  const acrOk = configuredAcr.size > 0 && acrValues.some((value) => configuredAcr.has(value));
  const amrOk = configuredAmr.size > 0 && amrValues.some((value) => configuredAmr.has(value));

  if (!fresh || (!acrOk && !amrOk)) {
    return {
      ok: false,
      status: 403,
      error: 'step_up_idp_reauthentication_required',
      message: 'Enterprise IdP session is not fresh enough or does not contain an allowed strong authentication claim.',
      details: {
        fresh,
        acrMatched: acrOk,
        amrMatched: amrOk,
      },
    };
  }

  return {
    ok: true,
    method: 'enterprise_idp',
    provider: policy.source === 'organization' ? 'enterprise_idp_organization_policy' : 'enterprise_idp',
    aal: acrValues[0] ?? amrValues[0] ?? null,
  };
}

async function verifySupabaseMfaStepUp(body: StepUpChallengeBody): Promise<RealVerificationResult | Response> {
  const factorId = getString(body.factorId);
  const challengeId = getString(body.challengeId);
  const code = getString(body.code);
  const supabase = await createServerSupabaseClient();
  const mfa = getMfaApi(supabase);

  if (!factorId) {
    const { data, error } = await mfa.listFactors();
    if (error) {
      return {
        ok: false,
        status: 503,
        error: 'step_up_mfa_factors_unavailable',
        message: 'Could not load enrolled MFA factors.',
      };
    }

    const factors = [
      ...(data?.totp ?? []),
      ...(data?.phone ?? []),
    ]
      .map(publicMfaFactor)
      .filter((factor): factor is PublicMfaFactor => Boolean(factor));

    return noStoreJson(
      {
        error: 'step_up_mfa_challenge_required',
        message: 'Choose an enrolled MFA factor and submit factorId with a fresh verification code.',
        factors,
        maxAgeMs: STEP_UP_MAX_AGE_MS,
      },
      { status: 401 },
    );
  }

  if (!code) {
    const { data, error } = await mfa.challenge({ factorId });
    const providerChallengeId = data?.id;
    if (error || !providerChallengeId) {
      return {
        ok: false,
        status: 403,
        error: 'step_up_mfa_challenge_denied',
        message: 'MFA challenge could not be created for the selected factor.',
      };
    }

    return noStoreJson(
      {
        status: 'mfa_challenge_issued',
        challengeId: providerChallengeId,
        factorId,
        message: 'Submit challengeId, factorId and the MFA code to receive a step-up token.',
        maxAgeMs: STEP_UP_MAX_AGE_MS,
      },
      { status: 200 },
    );
  }

  const verification = challengeId
    ? await mfa.verify({ factorId, challengeId, code })
    : typeof mfa.challengeAndVerify === 'function'
      ? await mfa.challengeAndVerify({ factorId, code })
      : {
          error: {
            message: 'challengeAndVerify unavailable',
          },
        };

  if (verification.error) {
    return {
      ok: false,
      status: 403,
      error: 'step_up_mfa_verification_denied',
      message: 'MFA verification failed.',
    };
  }

  const assurance = await mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = assurance.data?.currentLevel ?? null;
  if (assurance.error || currentLevel !== 'aal2') {
    return {
      ok: false,
      status: 403,
      error: 'step_up_mfa_aal2_required',
      message: 'MFA verification did not produce an aal2 session.',
    };
  }

  return {
    ok: true,
    method: 'supabase_mfa',
    provider: 'supabase_mfa',
    aal: currentLevel,
  };
}

async function verifyRealStepUp(
  body: StepUpChallengeBody,
  policy: EffectiveStepUpProviderPolicy,
): Promise<RealVerificationResult | Response> {
  const mode = policy.mode;

  if (!mode || !isEffectiveStepUpProviderPolicyConfigured(policy)) {
    return {
      ok: false,
      status: 503,
      error: 'step_up_provider_not_configured',
      message: 'Enterprise step-up is fail-closed until a real MFA/IdP provider policy is configured.',
    };
  }

  if (mode === 'supabase_mfa') return verifySupabaseMfaStepUp(body);
  if (mode === 'enterprise_idp') return verifyEnterpriseIdpStepUp(policy);

  const supabaseResult = await verifySupabaseMfaStepUp(body);
  if (supabaseResult instanceof Response || supabaseResult.ok) return supabaseResult;

  return verifyEnterpriseIdpStepUp(policy);
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
    key: `step-up:challenge:${organization.id}:${user.id}`,
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitDeniedResponse(rateLimit);
  }

  const body = await readBoundedJsonRequest<StepUpChallengeBody>(request, {
    maxBytes: STEP_UP_CHALLENGE_JSON_MAX_BYTES,
  }).catch(() => null);
  const action = normalizeHighRiskAction(body?.action);

  if (!body || !action) {
    return noStoreJson(
      {
        error: 'invalid_step_up_action',
        message: 'A supported high-risk action is required before step-up can be issued.',
        supportedActions: [
          'export_data',
          'manage_billing',
          'manage_team',
          'gdpr_delete',
          'audit_chain_verify',
          'audit_chain_export',
          'change_security_settings',
        ],
      },
      { status: 400 },
    );
  }

  const providerPolicy = await getEffectiveStepUpProviderPolicy(organization.id);

  await recordStepUpAuditEvent({
    event: 'step_up_requested',
    action,
    userId: user.id,
    organizationId: organization.id,
    verificationMethod: providerPolicy.mode,
  });

  const verification = await verifyRealStepUp(body, providerPolicy);

  if (verification instanceof Response) return verification;

  if (!verification.ok) {
    await recordStepUpAuditEvent({
      event: 'step_up_denied',
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
    action: action as HighRiskAction,
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
      action,
      policySource: providerPolicy.source,
    },
  });

  if (!persisted.ok) {
    await recordStepUpAuditEvent({
      event: 'step_up_denied',
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
        message: 'Step-up verification succeeded, but token persistence is unavailable. Critical actions remain blocked.',
      },
      { status: 503 },
    );
  }

  await recordStepUpAuditEvent({
    event: 'step_up_approved',
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
