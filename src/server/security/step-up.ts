import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

import { noStoreJson } from '@/server/security/no-store';

export const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
export const STEP_UP_CHALLENGE_MAX_AGE_MS = 2 * 60 * 1000;
export const STEP_UP_SIGNING_SECRET_ENV = 'STEP_UP_SIGNING_SECRET';
export const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';
export const STEP_UP_PROVIDER_MODE_ENV = 'STEP_UP_PROVIDER_MODE';

export type HighRiskAction =
  | 'export_data'
  | 'manage_billing'
  | 'manage_team'
  | 'gdpr_delete'
  | 'audit_chain_verify'
  | 'audit_chain_export'
  | 'change_security_settings';

export type StepUpVerificationMethod = 'supabase_mfa' | 'enterprise_idp';
export type StepUpProviderMode = 'supabase_mfa' | 'enterprise_idp' | 'supabase_mfa_or_enterprise_idp';

export type StepUpAuditEvent =
  | 'step_up_challenge_created'
  | 'step_up_verified'
  | 'step_up_failed'
  | 'step_up_expired'
  | 'step_up_scope_mismatch';

export type StepUpAssessmentInput = {
  action: HighRiskAction;
  verifiedAt?: string | number | Date | null;
  now?: string | number | Date;
  maxAgeMs?: number;
};

export type StepUpTokenInput = {
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  verifiedAt: string | number | Date;
  issuedAt?: string | number | Date;
  expiresAt?: string | number | Date;
  nonce?: string;
  verificationMethod?: StepUpVerificationMethod;
  secret?: string;
};

export type StepUpTokenPayload = {
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  verifiedAt: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  verificationMethod: StepUpVerificationMethod;
};

export type StepUpTokenEnvelope = {
  token: string;
  payload: StepUpTokenPayload;
};

export type StepUpTokenAssessmentInput = {
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  token?: string | null;
  now?: string | number | Date;
  maxAgeMs?: number;
  secret?: string;
};

export type StepUpRequestInput = {
  request: Request;
  action: HighRiskAction;
  userId: string;
  organizationId: string;
  now?: string | number | Date;
  maxAgeMs?: number;
  secret?: string;
  persist?: boolean;
  audit?: boolean;
};

export type StepUpAssessment = {
  ok: boolean;
  action: HighRiskAction;
  reason?:
    | 'missing_verification'
    | 'expired_verification'
    | 'invalid_verification'
    | 'missing_step_up_secret'
    | 'invalid_step_up_token'
    | 'missing_step_up_nonce'
    | 'step_up_token_scope_mismatch'
    | 'step_up_token_replayed'
    | 'step_up_token_revoked'
    | 'step_up_token_store_unavailable'
    | 'step_up_provider_not_configured';
  verifiedAt: string | null;
  issuedAt?: string | null;
  expiresAt: string | null;
  nonce?: string | null;
  verificationMethod?: StepUpVerificationMethod | null;
  maxAgeMs: number;
};

export type PublicStepUpSummary = {
  verified: true;
};

export type StepUpRequestResult =
  | { ok: true; assessment: StepUpAssessment }
  | { ok: false; assessment: StepUpAssessment; response: Response };

export type PersistStepUpTokenInput = {
  token: string;
  payload: StepUpTokenPayload;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  secret?: string;
};

export type PersistStepUpTokenResult =
  | { ok: true }
  | { ok: false; reason: 'missing_step_up_secret' | 'step_up_token_store_unavailable' };

export type ConsumeStepUpTokenResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'invalid_step_up_token'
        | 'step_up_token_scope_mismatch'
        | 'step_up_token_replayed'
        | 'step_up_token_revoked'
        | 'expired_verification'
        | 'step_up_token_store_unavailable'
        | 'missing_step_up_secret';
    };

export const HIGH_RISK_ACTIONS: ReadonlyArray<HighRiskAction> = [
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'audit_chain_export',
  'change_security_settings',
];

const HIGH_RISK_ACTION_SET = new Set<string>(HIGH_RISK_ACTIONS);

function toDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function splitConfiguredValues(value: string | null | undefined) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isEnterpriseReleaseEnabled() {
  return process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true' || process.env.EUROCOMPLY_ENTERPRISE_RELEASE === 'true';
}

function sanitizeMetadata(metadata?: PersistStepUpTokenInput['metadata']) {
  if (!metadata) return {};

  const blockedKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'authorization', 'cookie', 'jwt'];
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function normalizeHighRiskAction(value: unknown): HighRiskAction | null {
  const action = typeof value === 'string' ? value.trim() : '';
  return HIGH_RISK_ACTION_SET.has(action) ? (action as HighRiskAction) : null;
}

export function getStepUpSecret(explicitSecret?: string) {
  return explicitSecret ?? process.env.STEP_UP_SIGNING_SECRET ?? process.env.AUDIT_CHAIN_SIGNING_SECRET ?? null;
}

export function getStepUpProviderMode(): StepUpProviderMode | null {
  const mode = (process.env.STEP_UP_PROVIDER_MODE ?? '').trim().toLowerCase();
  if (mode === 'supabase_mfa' || mode === 'enterprise_idp' || mode === 'supabase_mfa_or_enterprise_idp') return mode;
  return null;
}

export function isEnterpriseStepUpConfigured() {
  const mode = getStepUpProviderMode();
  const hasSigningSecret = Boolean(getStepUpSecret());
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasIdpPolicy = splitConfiguredValues(process.env.STEP_UP_IDP_ACR_VALUES).length > 0
    || splitConfiguredValues(process.env.STEP_UP_IDP_AMR_VALUES).length > 0;

  if (!hasSigningSecret || !mode) return false;
  if (mode === 'supabase_mfa') return hasSupabase;
  if (mode === 'enterprise_idp') return hasSupabase && hasIdpPolicy;
  return hasSupabase;
}

export function hashStepUpToken(token: string, secret?: string) {
  const signingSecret = getStepUpSecret(secret);
  if (!signingSecret) return null;
  return createHmac('sha256', signingSecret).update(token).digest('hex');
}

export function publicStepUpSummary(assessment: StepUpAssessment): PublicStepUpSummary {
  void assessment;
  return { verified: true };
}

export function assessStepUp(input: StepUpAssessmentInput): StepUpAssessment {
  const maxAgeMs = input.maxAgeMs ?? STEP_UP_MAX_AGE_MS;
  const now = toDate(input.now ?? new Date()) ?? new Date();
  const verifiedAt = toDate(input.verifiedAt);

  if (!verifiedAt) {
    return {
      ok: false,
      action: input.action,
      reason: input.verifiedAt ? 'invalid_verification' : 'missing_verification',
      verifiedAt: null,
      expiresAt: null,
      maxAgeMs,
    };
  }

  const expiresAt = new Date(verifiedAt.getTime() + maxAgeMs);

  if (expiresAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      action: input.action,
      reason: 'expired_verification',
      verifiedAt: verifiedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxAgeMs,
    };
  }

  return {
    ok: true,
    action: input.action,
    verifiedAt: verifiedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxAgeMs,
  };
}

export function createStepUpTokenEnvelope(input: StepUpTokenInput): StepUpTokenEnvelope {
  const secret = getStepUpSecret(input.secret);

  if (!secret) {
    throw new Error('STEP_UP_SIGNING_SECRET is required to create step-up tokens');
  }

  const verifiedAt = toDate(input.verifiedAt);

  if (!verifiedAt) {
    throw new Error('A valid verifiedAt timestamp is required to create a step-up token');
  }

  const issuedAt = toDate(input.issuedAt) ?? verifiedAt;
  const maxExpiresAt = new Date(verifiedAt.getTime() + STEP_UP_MAX_AGE_MS);
  const requestedExpiresAt = toDate(input.expiresAt);
  const expiresAt = requestedExpiresAt && requestedExpiresAt.getTime() < maxExpiresAt.getTime() ? requestedExpiresAt : maxExpiresAt;
  const payload: StepUpTokenPayload = {
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    verifiedAt: verifiedAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: input.nonce ?? randomUUID(),
    verificationMethod: input.verificationMethod ?? 'supabase_mfa',
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  };
}

export function createStepUpToken(input: StepUpTokenInput) {
  return createStepUpTokenEnvelope(input).token;
}

export function assessStepUpToken(input: StepUpTokenAssessmentInput): StepUpAssessment {
  const maxAgeMs = input.maxAgeMs ?? STEP_UP_MAX_AGE_MS;
  const secret = getStepUpSecret(input.secret);
  const now = toDate(input.now ?? new Date()) ?? new Date();

  if (!input.token) {
    return { ok: false, action: input.action, reason: 'missing_verification', verifiedAt: null, expiresAt: null, maxAgeMs };
  }

  if (!secret) {
    return { ok: false, action: input.action, reason: 'missing_step_up_secret', verifiedAt: null, expiresAt: null, maxAgeMs };
  }

  const [encodedPayload, signature] = input.token.split('.');

  if (!encodedPayload || !signature) {
    return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
  }

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<StepUpTokenPayload>;

    if (payload.action !== input.action || payload.userId !== input.userId || payload.organizationId !== input.organizationId) {
      return { ok: false, action: input.action, reason: 'step_up_token_scope_mismatch', verifiedAt: null, expiresAt: null, maxAgeMs };
    }

    if (!payload.nonce || typeof payload.nonce !== 'string') {
      return { ok: false, action: input.action, reason: 'missing_step_up_nonce', verifiedAt: null, expiresAt: null, maxAgeMs };
    }

    const issuedAt = toDate(payload.issuedAt);
    const expiresAt = toDate(payload.expiresAt);
    const baseAssessment = assessStepUp({ action: input.action, verifiedAt: payload.verifiedAt, now, maxAgeMs });

    if (!baseAssessment.ok) return { ...baseAssessment, nonce: payload.nonce, issuedAt: issuedAt?.toISOString() ?? null };

    if (!issuedAt || !expiresAt) {
      return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
    }

    if (expiresAt.getTime() <= now.getTime()) {
      return {
        ok: false,
        action: input.action,
        reason: 'expired_verification',
        verifiedAt: baseAssessment.verifiedAt,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        nonce: payload.nonce,
        verificationMethod: payload.verificationMethod ?? null,
        maxAgeMs,
      };
    }

    if (expiresAt.getTime() > new Date(new Date(payload.verifiedAt ?? '').getTime() + maxAgeMs).getTime()) {
      return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
    }

    return {
      ...baseAssessment,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      nonce: payload.nonce,
      verificationMethod: payload.verificationMethod ?? null,
    };
  } catch {
    return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
  }
}

export async function persistStepUpTokenRecord(input: PersistStepUpTokenInput): Promise<PersistStepUpTokenResult> {
  const tokenHash = hashStepUpToken(input.token, input.secret);
  if (!tokenHash) return { ok: false, reason: 'missing_step_up_secret' };

  const { tryCreateAdminClient } = await import('@/lib/supabase/admin');
  const supabase = tryCreateAdminClient();
  if (!supabase) return { ok: false, reason: 'step_up_token_store_unavailable' };

  const { error } = await supabase.from('step_up_tokens').insert({
    nonce: input.payload.nonce,
    token_hash: tokenHash,
    user_id: input.payload.userId,
    organization_id: input.payload.organizationId,
    action: input.payload.action,
    verification_method: input.payload.verificationMethod,
    status: 'active',
    issued_at: input.payload.issuedAt,
    verified_at: input.payload.verifiedAt,
    expires_at: input.payload.expiresAt,
    metadata: sanitizeMetadata(input.metadata),
  });

  if (error) return { ok: false, reason: 'step_up_token_store_unavailable' };
  return { ok: true };
}

async function consumeStepUpToken({
  token,
  assessment,
  userId,
  organizationId,
  action,
  secret,
  now,
}: {
  token: string;
  assessment: StepUpAssessment;
  userId: string;
  organizationId: string;
  action: HighRiskAction;
  secret?: string;
  now?: string | number | Date;
}): Promise<ConsumeStepUpTokenResult> {
  const tokenHash = hashStepUpToken(token, secret);
  if (!tokenHash) return { ok: false, reason: 'missing_step_up_secret' };
  if (!assessment.nonce) return { ok: false, reason: 'invalid_step_up_token' };

  const { tryCreateAdminClient } = await import('@/lib/supabase/admin');
  const supabase = tryCreateAdminClient();
  if (!supabase) return { ok: false, reason: 'step_up_token_store_unavailable' };

  const { data, error } = await supabase
    .from('step_up_tokens')
    .select('nonce, token_hash, user_id, organization_id, action, status, expires_at, consumed_at, revoked_at')
    .eq('nonce', assessment.nonce)
    .maybeSingle();

  if (error) return { ok: false, reason: 'step_up_token_store_unavailable' };
  if (!data) return { ok: false, reason: 'invalid_step_up_token' };

  const record = data as {
    nonce: string;
    token_hash: string;
    user_id: string;
    organization_id: string;
    action: string;
    status: string | null;
    expires_at: string | null;
    consumed_at: string | null;
    revoked_at: string | null;
  };

  if (record.token_hash !== tokenHash || record.user_id !== userId || record.organization_id !== organizationId || record.action !== action) {
    return { ok: false, reason: 'step_up_token_scope_mismatch' };
  }

  if (record.revoked_at || record.status === 'revoked') return { ok: false, reason: 'step_up_token_revoked' };
  if (record.consumed_at || record.status === 'used') return { ok: false, reason: 'step_up_token_replayed' };

  const expiresAt = toDate(record.expires_at);
  const currentTime = toDate(now ?? new Date()) ?? new Date();
  if (!expiresAt || expiresAt.getTime() <= currentTime.getTime()) return { ok: false, reason: 'expired_verification' };

  const consumedAt = currentTime.toISOString();
  const { data: consumed, error: updateError } = await supabase
    .from('step_up_tokens')
    .update({ consumed_at: consumedAt, status: 'used' })
    .eq('nonce', assessment.nonce)
    .eq('status', 'active')
    .is('consumed_at', null)
    .is('revoked_at', null)
    .select('nonce')
    .maybeSingle();

  if (updateError) return { ok: false, reason: 'step_up_token_store_unavailable' };
  if (!consumed) return { ok: false, reason: 'step_up_token_replayed' };

  return { ok: true };
}

export async function recordStepUpAuditEvent(input: {
  event: StepUpAuditEvent;
  action: HighRiskAction;
  userId?: string | null;
  organizationId?: string | null;
  reason?: string | null;
  nonce?: string | null;
  verificationMethod?: string | null;
}) {
  try {
    const { writeAuditLog } = await import('@/lib/security/audit-log');
    await writeAuditLog({
      action: 'security.event',
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      entityType: 'step_up',
      entityId: input.nonce ?? input.action,
      metadata: {
        stepUpEvent: input.event,
        highRiskAction: input.action,
        reason: input.reason ?? null,
        nonce: input.nonce ?? null,
        verificationMethod: input.verificationMethod ?? null,
      },
    });
  } catch {
    // Audit logging must never leak token details or mask the original authorization result.
  }
}

export function stepUpRequiredResponse(assessment: StepUpAssessment) {
  return noStoreJson(
    {
      error: 'step_up_required',
      action: assessment.action,
      reason: assessment.reason ?? 'missing_verification',
      verifiedAt: assessment.verifiedAt,
      expiresAt: assessment.expiresAt,
      maxAgeMs: assessment.maxAgeMs,
    },
    { status: 403 },
  );
}

function auditEventForFailedAssessment(assessment: StepUpAssessment): StepUpAuditEvent {
  if (assessment.reason === 'expired_verification') return 'step_up_expired';
  if (assessment.reason === 'step_up_token_scope_mismatch') return 'step_up_scope_mismatch';
  return 'step_up_failed';
}

export async function requireStepUpForRequest(input: StepUpRequestInput): Promise<StepUpRequestResult> {
  const token = input.request.headers.get(STEP_UP_TOKEN_HEADER);
  let assessment = assessStepUpToken({
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    token,
    now: input.now,
    maxAgeMs: input.maxAgeMs,
    secret: input.secret,
  });

  if (assessment.ok && isEnterpriseReleaseEnabled() && !isEnterpriseStepUpConfigured()) {
    assessment = {
      ok: false,
      action: input.action,
      reason: 'step_up_provider_not_configured',
      verifiedAt: null,
      expiresAt: null,
      maxAgeMs: input.maxAgeMs ?? STEP_UP_MAX_AGE_MS,
    };
  }

  if (assessment.ok && input.persist !== false) {
    const consumed = await consumeStepUpToken({
      token: token ?? '',
      assessment,
      userId: input.userId,
      organizationId: input.organizationId,
      action: input.action,
      secret: input.secret,
      now: input.now,
    });

    if (!consumed.ok) {
      assessment = { ...assessment, ok: false, reason: consumed.reason };
    }
  }

  if (!assessment.ok) {
    if (input.audit !== false) {
      await recordStepUpAuditEvent({
        event: auditEventForFailedAssessment(assessment),
        action: input.action,
        userId: input.userId,
        organizationId: input.organizationId,
        reason: assessment.reason ?? 'missing_verification',
        nonce: assessment.nonce ?? null,
        verificationMethod: assessment.verificationMethod ?? null,
      });
    }

    return {
      ok: false,
      assessment,
      response: stepUpRequiredResponse(assessment),
    };
  }

  return { ok: true, assessment };
}
