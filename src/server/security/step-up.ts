import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

import { noStoreJson } from '@/server/security/no-store';

export const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
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
    | 'step_up_token_store_unavailable';
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

function sanitizeMetadata(metadata?: PersistStepUpTokenInput['metadata']) {
  if (!metadata) return {};

  const blockedKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'authorization', 'cookie', 'jwt'];
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
      .map(([key, value]) => [key, value ?? null]),
  );
}

function splitStepUpClaimValues(value: string | null | undefined) {
  return [...new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean))];
}

export function normalizeHighRiskAction(value: unknown): HighRiskAction | null {
  const action = typeof value === 'string' ? value.trim() : '';
  return HIGH_RISK_ACTION_SET.has(action) ? (action as HighRiskAction) : null;
}

export function getStepUpSecret(explicitSecret?: string) {
  return explicitSecret ?? process.env.STEP_UP_SIGNING_SECRET ?? process.env.AUDIT_CHAIN_SIGNING_SECRET ?? null;
}

export function getStepUpProviderMode() {
  const mode = (process.env.STEP_UP_PROVIDER_MODE ?? '').trim().toLowerCase();
  if (mode === 'supabase_mfa' || mode === 'enterprise_idp' || mode === 'supabase_mfa_or_enterprise_idp') return mode;
  return null;
}

export function getStepUpIdpClaimPolicyValues() {
  return {
    allowedAcrValues: splitStepUpClaimValues(process.env.STEP_UP_IDP_ACR_VALUES),
    allowedAmrValues: splitStepUpClaimValues(process.env.STEP_UP_IDP_AMR_VALUES),
  };
}

export function isEnterpriseStepUpConfigured() {
  const mode = getStepUpProviderMode();
  const hasSigningSecret = Boolean(getStepUpSecret());
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasIdpPolicy = Boolean(process.env.STEP_UP_IDP_ACR_VALUES || process.env.STEP_UP_IDP_AMR_VALUES);

  return Boolean(
    hasSigningSecret &&
      mode &&
      ((mode.includes('supabase_mfa') && hasSupabase) || (mode.includes('enterprise_idp') && hasIdpPolicy)),
  );
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
    throw new Error('Step-up signing secret is required to issue critical-action tokens.');
  }

  const verifiedAt = toDate(input.verifiedAt);
  if (!verifiedAt) throw new Error('A valid verifiedAt timestamp is required.');

  const issuedAt = toDate(input.issuedAt) ?? new Date();
  const expiresAt = toDate(input.expiresAt) ?? new Date(issuedAt.getTime() + STEP_UP_MAX_AGE_MS);
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

  const payloadText = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(payloadText);
  const signature = signPayload(payloadPart, secret);

  return {
    token: `${payloadPart}.${signature}`,
    payload,
  };
}
