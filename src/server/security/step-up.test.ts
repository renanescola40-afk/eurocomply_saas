import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STEP_UP_MAX_AGE_MS,
  STEP_UP_SIGNING_SECRET_ENV,
  STEP_UP_TOKEN_HEADER,
  assessStepUp,
  assessStepUpToken,
  createStepUpToken,
  createStepUpTokenEnvelope,
  hashStepUpToken,
  HIGH_RISK_ACTIONS,
  isEnterpriseStepUpConfigured,
  requireStepUpForRequest,
  stepUpRequiredResponse,
} from './step-up';

type StepUpTokenStoreRecord = {
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

const stepUpTokenStore = vi.hoisted(() => ({
  records: new Map<string, StepUpTokenStoreRecord>(),
}));

vi.mock('@/lib/supabase/admin', () => {
  class StepUpTokenQueryBuilder {
    private filters = new Map<string, unknown>();
    private updatePatch: Partial<StepUpTokenStoreRecord> | null = null;

    select() {
      return this;
    }

    eq(column: string, value: unknown) {
      this.filters.set(column, value);
      return this;
    }

    is(column: string, value: unknown) {
      this.filters.set(column, value);
      return this;
    }

    update(patch: Partial<StepUpTokenStoreRecord>) {
      this.updatePatch = patch;
      return this;
    }

    async maybeSingle() {
      const nonce = this.filters.get('nonce');
      if (typeof nonce !== 'string') return { data: null, error: null };

      const record = stepUpTokenStore.records.get(nonce);
      if (!record) return { data: null, error: null };

      if (!this.updatePatch) {
        return { data: record, error: null };
      }

      const statusFilter = this.filters.get('status');
      const consumedAtFilter = this.filters.get('consumed_at');
      const revokedAtFilter = this.filters.get('revoked_at');
      const matchesUpdateGuard =
        (statusFilter === undefined || record.status === statusFilter) &&
        (consumedAtFilter !== null || record.consumed_at === null) &&
        (revokedAtFilter !== null || record.revoked_at === null);

      if (!matchesUpdateGuard) {
        return { data: null, error: null };
      }

      const nextRecord = { ...record, ...this.updatePatch };
      stepUpTokenStore.records.set(nonce, nextRecord);
      return { data: { nonce }, error: null };
    }
  }

  return {
    tryCreateAdminClient: () => ({
      from: (table: string) => {
        if (table !== 'step_up_tokens') return null;
        return new StepUpTokenQueryBuilder();
      },
    }),
  };
});

const signingKeyForTests = ['test', 'step-up', 'signing', 'key'].join('-');
const tokenInput = {
  action: 'audit_chain_verify' as const,
  userId: 'user_123',
  organizationId: 'org_123',
  verifiedAt: '2026-06-12T10:00:00.000Z',
  nonce: 'nonce_123',
  secret: signingKeyForTests,
};

function requestWithStepUpToken(token: string) {
  return new Request('https://eurocomply.example/api/audit/chain/verify', {
    headers: {
      [STEP_UP_TOKEN_HEADER]: token,
    },
  });
}

describe('step-up authentication helper', () => {
  beforeEach(() => {
    stepUpTokenStore.records.clear();
  });

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
      secret: signingKeyForTests,
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

    const result = await requireStepUpForRequest({
      request: requestWithStepUpToken(token),
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      now: '2026-06-12T10:04:00.000Z',
      secret: signingKeyForTests,
      persist: false,
      audit: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assessment.expiresAt).toBe('2026-06-12T10:05:00.000Z');
    }
  });

  it('rejects replayed single-use request helper tokens', async () => {
    const envelope = createStepUpTokenEnvelope(tokenInput);
    const tokenHash = hashStepUpToken(envelope.token, signingKeyForTests);
    expect(tokenHash).toBeTruthy();

    stepUpTokenStore.records.set(envelope.payload.nonce, {
      nonce: envelope.payload.nonce,
      token_hash: tokenHash ?? 'missing-token-hash',
      user_id: envelope.payload.userId,
      organization_id: envelope.payload.organizationId,
      action: envelope.payload.action,
      status: 'active',
      expires_at: envelope.payload.expiresAt,
      consumed_at: null,
      revoked_at: null,
    });

    const first = await requireStepUpForRequest({
      request: requestWithStepUpToken(envelope.token),
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      now: '2026-06-12T10:04:00.000Z',
      secret: signingKeyForTests,
      audit: false,
    });

    expect(first.ok).toBe(true);
    expect(stepUpTokenStore.records.get(envelope.payload.nonce)?.status).toBe('used');

    const replay = await requireStepUpForRequest({
      request: requestWithStepUpToken(envelope.token),
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      now: '2026-06-12T10:04:10.000Z',
      secret: signingKeyForTests,
      audit: false,
    });

    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.assessment.reason).toBe('step_up_token_replayed');
      expect(replay.response.status).toBe(403);
    }
  });

  it('rejects missing request helper tokens with no-store response', async () => {
    const result = await requireStepUpForRequest({
      request: new Request('https://eurocomply.example/api/audit/chain/verify'),
      action: 'audit_chain_verify',
      userId: 'user_123',
      organizationId: 'org_123',
      secret: signingKeyForTests,
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
      secret: signingKeyForTests,
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
      secret: signingKeyForTests,
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
      secret: signingKeyForTests,
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
      secret: signingKeyForTests,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'expired_verification' });
  });

  it('fails closed when enterprise MFA/IdP provider is not configured', () => {
    const previousProviderMode = process.env.STEP_UP_PROVIDER_MODE;
    const previousSecret = process.env[STEP_UP_SIGNING_SECRET_ENV];
    delete process.env.STEP_UP_PROVIDER_MODE;
    process.env[STEP_UP_SIGNING_SECRET_ENV] = signingKeyForTests;

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
