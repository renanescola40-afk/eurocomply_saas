import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertTrustedOrigin: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/server/security/origin-guard', () => ({
  assertTrustedOrigin: mocks.assertTrustedOrigin,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: mocks.rateLimitResponse,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

import { POST } from './route';

function buildRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://app.eurocomply.test/api/auth/recovery', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
      'x-forwarded-for': '192.0.2.10',
      'user-agent': 'account-recovery-test',
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

function allowedRateLimit() {
  return {
    allowed: true,
    limit: 3,
    remaining: 2,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 0,
    category: 'auth',
    policy: 'password-reset',
    highRisk: true,
    failureMode: 'fail-closed',
    audit: false,
    key: 'hashed-fixture',
    userId: null,
    organizationId: null,
    route: '/api/auth/recovery',
    action: 'account_recovery_request',
  };
}

describe('account recovery request security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.checkDistributedRateLimit.mockResolvedValue(allowedRateLimit());
    mocks.rateLimitResponse.mockReturnValue(
      new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }),
    );
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
    });
  });

  it('returns the same generic no-store response for a valid recovery request', async () => {
    const response = await POST(buildRequest({ email: 'owner@example.test', locale: 'pt' }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({
      ok: true,
      message: 'If an account exists for that email, a secure recovery link will be sent.',
    });
    expect(JSON.stringify(body)).not.toContain('owner@example.test');
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.test', {
      redirectTo: 'https://app.eurocomply.test/pt/reset-password',
    });
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: 'password-reset',
        failureMode: 'fail-closed',
        limit: 3,
        windowMs: 60 * 60 * 1000,
      }),
    );
    expect(String(mocks.checkDistributedRateLimit.mock.calls[0]?.[0]?.key)).not.toContain('owner@example.test');
  });

  it('rejects malformed email input before calling the provider', async () => {
    const response = await POST(buildRequest({ email: 'not-an-email', locale: 'pt' }));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'invalid_recovery_request' });
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('blocks untrusted origins before reading or sending recovery data', async () => {
    mocks.assertTrustedOrigin.mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'untrusted_origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }),
    );

    const response = await POST(buildRequest({ email: 'owner@example.test', locale: 'pt' }));

    expect(response.status).toBe(403);
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('fails closed when the distributed password-reset limiter blocks the request', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValueOnce({
      ...allowedRateLimit(),
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
      audit: true,
    });

    const response = await POST(buildRequest({ email: 'owner@example.test', locale: 'en' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.rateLimitResponse).toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('uses one sanitized response while recording a distinguishable unavailable provider failure', async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: { code: 'provider_unavailable', message: 'raw provider diagnostic' },
    });

    const response = await POST(buildRequest({ email: 'owner@example.test', locale: 'de' }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'account_recovery_unavailable' });
    expect(JSON.stringify(body)).not.toContain('owner@example.test');
    expect(JSON.stringify(body)).not.toContain('raw provider diagnostic');
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: 'account_recovery_provider',
        provider: 'supabase',
        providerFailureKind: 'unavailable',
        providerFailureCode: 'provider_unavailable',
        providerOperation: 'password_recovery_request',
        retryable: true,
        providerHttpStatus: 503,
      }),
    );
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('owner@example.test');
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('raw provider diagnostic');
  });

  it('classifies provider client configuration failure without exposing its detail', async () => {
    mocks.createServerSupabaseClient.mockRejectedValueOnce(new Error('configuration detail'));

    const response = await POST(buildRequest({ email: 'owner@example.test', locale: 'fr' }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'account_recovery_unavailable' });
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        area: 'account_recovery_provider',
        provider: 'supabase',
        providerFailureKind: 'configuration',
        providerFailureCode: 'error',
        providerOperation: 'password_recovery_request',
        retryable: false,
        providerHttpStatus: 503,
      }),
    );
    expect(JSON.stringify(mocks.reportError.mock.calls)).not.toContain('configuration detail');
  });
});
