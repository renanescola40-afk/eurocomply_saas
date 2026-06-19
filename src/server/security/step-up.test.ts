import { describe, expect, it } from 'vitest';

import {
  STEP_UP_MAX_AGE_MS,
  STEP_UP_SIGNING_SECRET_ENV,
  STEP_UP_TOKEN_HEADER,
  assessStepUp,
  assessStepUpToken,
  createStepUpToken,
  createStepUpTokenEnvelope,
  HIGH_RISK_ACTIONS,
  isEnterpriseStepUpConfigured,
  requireStepUpForRequest,
  stepUpRequiredResponse,
} from './step-up';

const secret = 'test-step-up-secret';
const tokenInput = {
  action: 'audit_chain_verify' as const,
  userId: 'user_123',
  organizationId: 'org_123',
  verifiedAt: '2026-06-12T10:00:00.000Z',
  nonce: 'nonce_123',
  secret,
};

describe('step-up authentication helper', () => {
  it('lists high-risk actions that require explicit policy review', () => {
    expect(HIGH_RISK_ACTIONS).toEqual(
      expect.arrayContaining([
        'export_data',
        'manage_billing',
        'manage_team',
        'gdpr_delete',
        'audit_chain_verify',
        'audit_chain_export',
        'change_security_settings',
      ]),
    );
  });

  it('uses a short enterprise step-up window', () => {
    expect(STEP_UP_MAX_AGE_MS).toBe(5 * 60 * 1000);
  });

  it('accepts a fresh verification timestamp', () => {
    const assessment = assessStepUp({
      action: 'export_data',
      verifiedAt: '2026-06-12T10:00:00.000Z',
      now: '2026-06-12T10:04:59.000Z',
    });

    expect(assessment).toMatchObject({ ok: true, action: 'export_data' });
    expect(assessment.expiresAt).toBe('2026-06-12T10:05:00.000Z');
  });

  it('creates and accepts a signed scoped step-up token with nonce and expiry', () => {
    const envelope = createStepUpTokenEnvelope(tokenInput);
    const assessment = assessStepUpToken({
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      token: envelope.token,
      now: '2026-06-12T10:04:00.000Z',
      secret,
    });

    expect(envelope.token).toContain('.');
    expect(envelope.payload).toMatchObject({
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      nonce: 'nonce_123',
      verificationMethod: 'supabase_mfa',
    });
    expect(assessment).toMatchObject({ ok: true, action: 'audit_chain_verify', nonce: 'nonce_123' });
    expect(assessment.expiresAt).toBe('2026-06-12T10:05:00.000Z');
  });

  it('accepts valid signed tokens through the reusable request helper', async () => {
    const token = createStepUpToken(tokenInput);
    const request = new Request('https://eurocomply.example/api/audit/chain/verify', {
      headers: {
        [STEP_UP_TOKEN_HEADER]: token,
      },
    });

    const result = await requireStepUpForRequest({
      request,
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      now: '2026-06-12T10:04:00.000Z',
      secret,
      persist: false,
      audit: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assessment.expiresAt).toBe('2026-06-12T10:05:00.000Z');
    }
  });

  it('rejects missing request helper tokens with no-store response', async () => {
    const result = await requireStepUpForRequest({
      request: new Request('https://eurocomply.example/api/audit/chain/verify'),
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      secret,
      persist: false,
      audit: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.assessment.reason).toBe('missing_verification');
      expect(result.response.status).toBe(403);
      expect(result.response.headers.get('Cache-Control')).toContain('no-store');
    }
  });

  it('rejects a tampered signed step-up token', () => {
    const token = createStepUpToken(tokenInput);
    const assessment = assessStepUpToken({
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      token: `${token}tampered`,
      now: '2026-06-12T10:04:00.000Z',
      secret,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'invalid_step_up_token' });
  });

  it('rejects a signed token scoped to another organization', () => {
    const token = createStepUpToken(tokenInput);
    const assessment = assessStepUpToken({
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_other',
      token,
      now: '2026-06-12T10:04:00.000Z',
      secret,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'step_up_token_scope_mismatch' });
  });

  it('rejects a signed token scoped to another action', () => {
    const token = createStepUpToken(tokenInput);
    const assessment = assessStepUpToken({
      action: 'audit_chain_export',
      userId: 'user_123',
      organizationId: 'org_123',
      token,
      now: '2026-06-12T10:04:00.000Z',
      secret,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'step_up_token_scope_mismatch' });
  });

  it('rejects a missing verification timestamp', () => {
    expect(assessStepUp({ action: 'manage_billing', verifiedAt: null })).toMatchObject({
      ok: false,
      action: 'manage_billing',
      reason: 'missing_verification',
    });
  });

  it('rejects an invalid verification timestamp', () => {
    expect(assessStepUp({ action: 'manage_team', verifiedAt: 'not-a-date' })).toMatchObject({
      ok: false,
      action: 'manage_team',
      reason: 'invalid_verification',
    });
  });

  it('rejects an expired verification timestamp', () => {
    expect(
      assessStepUp({
        action: 'gdpr_delete',
        verifiedAt: '2026-06-12T10:00:00.000Z',
        now: '2026-06-12T10:05:00.000Z',
      }),
    ).toMatchObject({
      ok: false,
      action: 'gdpr_delete',
      reason: 'expired_verification',
    });
  });

  it('rejects an expired signed step-up token', () => {
    const token = createStepUpToken(tokenInput);
    const assessment = assessStepUpToken({
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      token,
      now: '2026-06-12T10:06:00.000Z',
      secret,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'expired_verification' });
  });

  it('fails closed when enterprise MFA/IdP provider is not configured', () => {
    const previousProviderMode = process.env.STEP_UP_PROVIDER_MODE;
    const previousSecret = process.env[STEP_UP_SIGNING_SECRET_ENV];
    delete process.env.STEP_UP_PROVIDER_MODE;
    process.env[STEP_UP_SIGNING_SECRET_ENV] = secret;

    expect(isEnterpriseStepUpConfigured()).toBe(false);

    if (previousProviderMode === undefined) {
      delete process.env.STEP_UP_PROVIDER_MODE;
    } else {
      process.env.STEP_UP_PROVIDER_MODE = previousProviderMode;
    }

    if (previousSecret === undefined) {
      delete process.env[STEP_UP_SIGNING_SECRET_ENV];
    } else {
      process.env[STEP_UP_SIGNING_SECRET_ENV] = previousSecret;
    }
  });

  it('returns no-store headers for step-up required responses', () => {
    const response = stepUpRequiredResponse(
      assessStepUp({
        action: 'audit_chain_verify',
        verifiedAt: null,
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });
});
