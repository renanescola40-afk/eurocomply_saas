import { noStoreJson } from '@/server/security/no-store';

export const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000;

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

export type StepUpAssessment = {
  ok: boolean;
  action: HighRiskAction;
  reason?: 'missing_verification' | 'expired_verification' | 'invalid_verification';
  verifiedAt: string | null;
  expiresAt: string | null;
  maxAgeMs: number;
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

function toDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
