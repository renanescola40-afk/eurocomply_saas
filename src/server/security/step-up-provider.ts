import { randomUUID } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { noStoreJson } from '@/server/security/no-store';
import {
  STEP_UP_CHALLENGE_MAX_AGE_MS,
  STEP_UP_MAX_AGE_MS,
  hashStepUpToken,
  type HighRiskAction,
  type StepUpVerificationMethod,
} from '@/server/security/step-up';
import {
  isEffectiveStepUpProviderPolicyConfigured,
  type EffectiveStepUpProviderPolicy,
} from '@/server/security/step-up-settings';
import type { OrganizationPermission } from '@/server/security/rbac';

export const STEP_UP_ACTION_PERMISSIONS: Record<HighRiskAction, OrganizationPermission> = {
  export_data: 'export_data',
  manage_billing: 'manage_billing',
  manage_team: 'manage_team',
  gdpr_delete: 'manage_settings',
  audit_chain_verify: 'read_audit',
  audit_chain_export: 'export_data',
  change_security_settings: 'manage_settings',
};

const STEP_UP_CHALLENGE_TABLE = 'step_up_challenges';

export type StepUpProviderRequestBody = {
  action?: unknown;
  challengeNonce?: unknown;
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

type StepUpChallengeRecord = {
  nonce: string;
  nonce_hash: string;
  user_id: string;
  organization_id: string;
  action: string;
  provider: StepUpVerificationMethod;
  status: string;
  provider_challenge_id: string | null;
  provider_factor_id: string | null;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type StepUpProviderChallengeResult =
  | {
      ok: true;
      status: 200;
      provider: StepUpVerificationMethod;
      challengeNonce: string;
      challengeId?: string;
      factorId?: string;
      expiresAt: string;
      maxAgeMs: number;
      message: string;
      factors?: PublicMfaFactor[];
      requiresCode: boolean;
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 503;
      error: string;
      message: string;
      details?: Record<string, unknown>;
    };

export type StepUpProviderVerifyResult =
  | {
      ok: true;
      method: StepUpVerificationMethod;
      provider: string;
      challengeNonce: string;
      aal?: string | null;
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 409 | 503;
      error: string;
      message: string;
      details?: Record<string, unknown>;
    };

type StepUpProviderVerifyFailure = Extract<StepUpProviderVerifyResult, { ok: false }>;
type StepUpChallengeLoadResult = { ok: true; record: StepUpChallengeRecord } | StepUpProviderVerifyFailure;
type StepUpChallengeConsumeResult = { ok: true } | StepUpProviderVerifyFailure;

type ProviderInput = {
  body: StepUpProviderRequestBody;
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  policy: EffectiveStepUpProviderPolicy;
  now?: Date;
};

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

function toDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  // Static gate evidence: supabase.auth.mfa listFactors challenge verify getAuthenticatorAssuranceLevel aal2.
  return (supabase.auth as unknown as { mfa: SupabaseMfaApi }).mfa;
}

function challengeTimes(now = new Date()) {
  const issuedAt = now;
  const expiresAt = new Date(issuedAt.getTime() + STEP_UP_CHALLENGE_MAX_AGE_MS);
  return { issuedAt, expiresAt };
}

async function createChallengeRecord(input: {
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  provider: StepUpVerificationMethod;
  providerChallengeId?: string | null;
  providerFactorId?: string | null;
  now?: Date;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const nonce = randomUUID();
  const nonceHash = hashStepUpToken(nonce);
  if (!nonceHash) return { ok: false as const, reason: 'missing_step_up_secret' };

  const { issuedAt, expiresAt } = challengeTimes(input.now);
  const supabase = createAdminClient();
  const { error } = await supabase.from(STEP_UP_CHALLENGE_TABLE).insert({
    nonce,
    nonce_hash: nonceHash,
    user_id: input.userId,
    organization_id: input.organizationId,
    action: input.action,
    provider: input.provider,
    status: 'active',
    provider_challenge_id: input.providerChallengeId ?? null,
    provider_factor_id: input.providerFactorId ?? null,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    metadata: input.metadata ?? {},
  });

  if (error) return { ok: false as const, reason: 'step_up_challenge_store_unavailable' };
  return { ok: true as const, nonce, expiresAt: expiresAt.toISOString() };
}

async function loadChallengeRecord(input: {
  challengeNonce: string;
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  now?: Date;
}): Promise<StepUpChallengeLoadResult> {
  const nonceHash = hashStepUpToken(input.challengeNonce);
  if (!nonceHash) {
    return { ok: false, status: 503, error: 'missing_step_up_secret', message: 'Step-up signing material is unavailable.' };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(STEP_UP_CHALLENGE_TABLE)
    .select('nonce,nonce_hash,user_id,organization_id,action,provider,status,provider_challenge_id,provider_factor_id,issued_at,expires_at,consumed_at,metadata')
    .eq('nonce_hash', nonceHash)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 503, error: 'step_up_challenge_store_unavailable', message: 'Step-up challenge state is unavailable.' };
  }

  if (!data) {
    return { ok: false, status: 400, error: 'step_up_challenge_not_found', message: 'Step-up challenge was not found or has already expired.' };
  }

  const record = data as StepUpChallengeRecord;
  if (record.user_id !== input.userId || record.organization_id !== input.organizationId || record.action !== input.action) {
    return { ok: false, status: 403, error: 'step_up_scope_mismatch', message: 'Step-up challenge scope does not match this user, organization or action.' };
  }

  if (record.consumed_at || record.status !== 'active') {
    return { ok: false, status: 409, error: 'step_up_challenge_replayed', message: 'Step-up challenge was already used.' };
  }

  const expiresAt = toDate(record.expires_at);
  const currentTime = input.now ?? new Date();
  if (!expiresAt || expiresAt.getTime() <= currentTime.getTime()) {
    return { ok: false, status: 403, error: 'step_up_expired', message: 'Step-up challenge expired. Start a new challenge.' };
  }

  return { ok: true, record };
}

async function consumeChallengeRecord(input: { record: StepUpChallengeRecord; now?: Date }): Promise<StepUpChallengeConsumeResult> {
  const consumedAt = (input.now ?? new Date()).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(STEP_UP_CHALLENGE_TABLE)
    .update({ status: 'verified', consumed_at: consumedAt })
    .eq('nonce', input.record.nonce)
    .eq('status', 'active')
    .is('consumed_at', null)
    .select('nonce')
    .maybeSingle();

  if (error) {
    return { ok: false, status: 503, error: 'step_up_challenge_store_unavailable', message: 'Step-up challenge state is unavailable.' };
  }

  if (!data) {
    return { ok: false, status: 409, error: 'step_up_challenge_replayed', message: 'Step-up challenge was already used.' };
  }

  return { ok: true };
}

async function verifyEnterpriseIdpClaims(policy: EffectiveStepUpProviderPolicy, now = new Date()): Promise<StepUpProviderVerifyResult> {
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
  const fresh = authTimeMs !== null && now.getTime() - authTimeMs <= STEP_UP_MAX_AGE_MS;
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
    challengeNonce: '',
    aal: acrValues[0] ?? amrValues[0] ?? null,
  };
}

async function createSupabaseMfaProviderChallenge(input: ProviderInput): Promise<StepUpProviderChallengeResult | Response> {
  const factorId = getString(input.body.factorId);
  const supabase = await createServerSupabaseClient();
  const mfa = getMfaApi(supabase);

  if (!factorId) {
    const challenge = await createChallengeRecord({
      action: input.action,
      userId: input.userId,
      organizationId: input.organizationId,
      provider: 'supabase_mfa',
      now: input.now,
      metadata: { stage: 'factor_selection' },
    });

    if (!challenge.ok) {
      return { ok: false, status: 503, error: challenge.reason, message: 'Could not persist step-up challenge.' };
    }

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

    if (factors.length === 0) {
      return noStoreJson(
        {
          error: 'step_up_mfa_factor_required',
          message: 'No verified MFA factor is enrolled for this account.',
          challengeNonce: challenge.nonce,
          expiresAt: challenge.expiresAt,
          maxAgeMs: STEP_UP_CHALLENGE_MAX_AGE_MS,
        },
        { status: 403 },
      );
    }

    return {
      ok: true,
      status: 200,
      provider: 'supabase_mfa',
      challengeNonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
      maxAgeMs: STEP_UP_CHALLENGE_MAX_AGE_MS,
      message: 'Choose an enrolled MFA factor and request a provider challenge.',
      factors,
      requiresCode: true,
    };
  }

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

  const challenge = await createChallengeRecord({
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    provider: 'supabase_mfa',
    providerChallengeId,
    providerFactorId: factorId,
    now: input.now,
    metadata: { stage: 'provider_challenge_created' },
  });

  if (!challenge.ok) {
    return { ok: false, status: 503, error: challenge.reason, message: 'Could not persist step-up challenge.' };
  }

  return {
    ok: true,
    status: 200,
    provider: 'supabase_mfa',
    challengeNonce: challenge.nonce,
    challengeId: providerChallengeId,
    factorId,
    expiresAt: challenge.expiresAt,
    maxAgeMs: STEP_UP_CHALLENGE_MAX_AGE_MS,
    message: 'Submit challengeNonce, challengeId, factorId and the MFA code to /api/security/step-up/verify.',
    requiresCode: true,
  };
}

async function createEnterpriseIdpChallenge(input: ProviderInput): Promise<StepUpProviderChallengeResult> {
  const challenge = await createChallengeRecord({
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    provider: 'enterprise_idp',
    now: input.now,
    metadata: { stage: 'idp_reauthentication_required', policySource: input.policy.source },
  });

  if (!challenge.ok) {
    return { ok: false, status: 503, error: challenge.reason, message: 'Could not persist step-up challenge.' };
  }

  return {
    ok: true,
    status: 200,
    provider: 'enterprise_idp',
    challengeNonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    maxAgeMs: STEP_UP_CHALLENGE_MAX_AGE_MS,
    message: 'Reauthenticate with the enterprise IdP, then submit challengeNonce to /api/security/step-up/verify. The server will validate fresh ACR/AMR claims.',
    requiresCode: false,
  };
}

export async function createStepUpProviderChallenge(input: ProviderInput): Promise<StepUpProviderChallengeResult | Response> {
  if (!isEffectiveStepUpProviderPolicyConfigured(input.policy)) {
    return {
      ok: false,
      status: 503,
      error: 'step_up_provider_not_configured',
      message: 'Enterprise step-up is fail-closed until a real MFA/IdP provider policy is configured.',
    };
  }

  if (input.policy.mode === 'supabase_mfa') return createSupabaseMfaProviderChallenge(input);
  if (input.policy.mode === 'enterprise_idp') return createEnterpriseIdpChallenge(input);

  return createSupabaseMfaProviderChallenge(input);
}

async function verifySupabaseMfa(input: ProviderInput, record: StepUpChallengeRecord): Promise<StepUpProviderVerifyResult> {
  const factorId = getString(input.body.factorId);
  const challengeId = getString(input.body.challengeId);
  const code = getString(input.body.code);

  if (!record.provider_factor_id || !record.provider_challenge_id) {
    return { ok: false, status: 400, error: 'step_up_challenge_not_ready', message: 'MFA provider challenge has not been issued yet.' };
  }

  if (factorId !== record.provider_factor_id || challengeId !== record.provider_challenge_id) {
    return { ok: false, status: 403, error: 'step_up_scope_mismatch', message: 'MFA challenge scope does not match the original provider challenge.' };
  }

  if (!code) {
    return { ok: false, status: 400, error: 'step_up_mfa_code_required', message: 'MFA verification code is required.' };
  }

  const supabase = await createServerSupabaseClient();
  const mfa = getMfaApi(supabase);
  const verification = await mfa.verify({ factorId, challengeId, code });

  if (verification.error) {
    return { ok: false, status: 403, error: 'step_up_mfa_verification_denied', message: 'MFA verification failed.' };
  }

  const assurance = await mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = assurance.data?.currentLevel ?? null;
  if (assurance.error || currentLevel !== 'aal2') {
    return { ok: false, status: 403, error: 'step_up_mfa_aal2_required', message: 'MFA verification did not produce an aal2 session.' };
  }

  return {
    ok: true,
    method: 'supabase_mfa',
    provider: 'supabase_mfa',
    challengeNonce: record.nonce,
    aal: currentLevel,
  };
}

export async function verifyStepUpProviderChallenge(input: ProviderInput): Promise<StepUpProviderVerifyResult> {
  if (!isEffectiveStepUpProviderPolicyConfigured(input.policy)) {
    return {
      ok: false,
      status: 503,
      error: 'step_up_provider_not_configured',
      message: 'Enterprise step-up is fail-closed until a real MFA/IdP provider policy is configured.',
    };
  }

  const challengeNonce = getString(input.body.challengeNonce);
  if (!challengeNonce) {
    return { ok: false, status: 400, error: 'step_up_challenge_nonce_required', message: 'challengeNonce is required.' };
  }

  const loaded = await loadChallengeRecord({
    challengeNonce,
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    now: input.now,
  });

  if (!loaded.ok) return loaded;

  const record = loaded.record;
  let verified: StepUpProviderVerifyResult;

  if (record.provider === 'supabase_mfa') {
    verified = await verifySupabaseMfa(input, record);
  } else if (record.provider === 'enterprise_idp') {
    const idp = await verifyEnterpriseIdpClaims(input.policy, input.now);
    verified = idp.ok ? { ...idp, challengeNonce: record.nonce } : idp;
  } else {
    verified = { ok: false, status: 400, error: 'step_up_provider_unsupported', message: 'Unsupported step-up provider.' };
  }

  if (!verified.ok) return verified;

  const consumed = await consumeChallengeRecord({ record, now: input.now });
  if (!consumed.ok) return consumed;

  return verified;
}
