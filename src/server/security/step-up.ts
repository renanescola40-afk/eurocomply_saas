import { createHmac, timingSafeEqual } from 'crypto';

import { noStoreJson } from '@/server/security/no-store';

export const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000;
export const STEP_UP_SIGNING_SECRET_ENV = 'STEP_UP_SIGNING_SECRET';
export const STEP_UP_TOKEN_HEADER = 'x-eurocomply-step-up-token';

export type HighRiskAction =
  | 'export_data'
  | 'manage_billing'
  | 'manage_team'
  | 'gdpr_delete'
  | 'audit_chain_verify'
  | 'audit_chain_export'
  | 'change_security_settings';

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
  nonce?: string;
  secret?: string;
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
    | 'step_up_token_scope_mismatch';
  verifiedAt: string | null;
  expiresAt: string | null;
  maxAgeMs: number;
};

export type StepUpRequestResult =
  | { ok: true; assessment: StepUpAssessment }
  | { ok: false; assessment: StepUpAssessment; response: Response };

export const HIGH_RISK_ACTIONS: ReadonlyArray<HighRiskAction> = [
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'audit_chain_export',
  'change_security_settings',
];

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

function getStepUpSecret(explicitSecret?: string) {
  return explicitSecret ?? process.env.STEP_UP_SIGNING_SECRET ?? process.env.AUDIT_CHAIN_SIGNING_SECRET ?? null;
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

  if (expiresAt.getTime() < now.getTime()) {
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

export function createStepUpToken(input: StepUpTokenInput) {
  const secret = getStepUpSecret(input.secret);

  if (!secret) {
    throw new Error('STEP_UP_SIGNING_SECRET is required to create step-up tokens');
  }

  const verifiedAt = toDate(input.verifiedAt);

  if (!verifiedAt) {
    throw new Error('A valid verifiedAt timestamp is required to create a step-up token');
  }

  const payload = JSON.stringify({
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    verifiedAt: verifiedAt.toISOString(),
    nonce: input.nonce ?? '',
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function assessStepUpToken(input: StepUpTokenAssessmentInput): StepUpAssessment {
  const maxAgeMs = input.maxAgeMs ?? STEP_UP_MAX_AGE_MS;
  const secret = getStepUpSecret(input.secret);

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
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      action?: string;
      userId?: string;
      organizationId?: string;
      verifiedAt?: string;
    };

    if (payload.action !== input.action || payload.userId !== input.userId || payload.organizationId !== input.organizationId) {
      return { ok: false, action: input.action, reason: 'step_up_token_scope_mismatch', verifiedAt: null, expiresAt: null, maxAgeMs };
    }

    return assessStepUp({ action: input.action, verifiedAt: payload.verifiedAt, now: input.now, maxAgeMs });
  } catch {
    return { ok: false, action: input.action, reason: 'invalid_step_up_token', verifiedAt: null, expiresAt: null, maxAgeMs };
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

export function requireStepUpForRequest(input: StepUpRequestInput): StepUpRequestResult {
  const assessment = assessStepUpToken({
    action: input.action,
    userId: input.userId,
    organizationId: input.organizationId,
    token: input.request.headers.get(STEP_UP_TOKEN_HEADER),
    now: input.now,
    maxAgeMs: input.maxAgeMs,
    secret: input.secret,
  });

  if (!assessment.ok) {
    return {
      ok: false,
      assessment,
      response: stepUpRequiredResponse(assessment),
    };
  }

  return { ok: true, assessment };
}
