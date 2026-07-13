import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isAuthorizedInternalCronRequest: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/security/internal-cron', () => ({
  isAuthorizedInternalCronRequest: mocks.isAuthorizedInternalCronRequest,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  getClientIpFromRequest: (request: Request) => request.headers.get('x-forwarded-for'),
  getUserAgentFromRequest: (request: Request) => request.headers.get('user-agent'),
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: mocks.sendEmail,
}));

import { POST } from './route';

function buildRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request('https://app.risckcomply.test/api/internal/email/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function allowedRateLimitResult(overrides: Record<string, unknown> = {}) {
  return {
    allowed: true,
    limit: 5,
    remaining: 4,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 60,
    category: 'health-internal',
    policy: 'health-internal',
    highRisk: false,
    failureMode: 'fail-closed',
    audit: false,
    key: 'internal-email-test:route',
    userId: null,
    organizationId: null,
    route: '/api/internal/email/test',
    action: 'send_test_email',
    ...overrides,
  };
}

describe('internal email test route hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('INTERNAL_EMAIL_TEST_ALLOWED_RECIPIENTS', 'qa@example.test, *@risckcomply.test');
    mocks.isAuthorizedInternalCronRequest.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue(allowedRateLimitResult());
    mocks.sendEmail.mockResolvedValue({
      sent: true,
      provider: 'resend',
      id: 'email_test_123',
      status: 'sent',
      attempts: 1,
    });
  });

  it('rate limits requests before rejecting a missing internal secret', async () => {
    mocks.isAuthorizedInternalCronRequest.mockReturnValue(false);

    const response = await POST(buildRequest({ to: 'qa@example.test' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'internal-auth:/api/internal/email/test',
        policy: 'auth',
        route: '/api/internal/email/test',
        action: 'authenticate_internal_email_test',
        ip: '203.0.113.10',
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rate limits requests before rejecting an invalid internal secret', async () => {
    mocks.isAuthorizedInternalCronRequest.mockReturnValue(false);

    const response = await POST(buildRequest({ to: 'qa@example.test' }, { authorization: 'Bearer wrong-secret' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'internal-auth:/api/internal/email/test',
        policy: 'auth',
        action: 'authenticate_internal_email_test',
        ip: '203.0.113.10',
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rejects oversized JSON bodies', async () => {
    const response = await POST(
      buildRequest(
        { to: 'qa@example.test' },
        {
          authorization: 'Bearer test-secret',
          'content-length': String(4096 + 1),
        },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.error).toBe('invalid_request_payload');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads without exposing parser or schema details', async () => {
    const response = await POST(
      buildRequest(
        { to: 'not-an-email', template: 'made_up_template', unexpected: true },
        { authorization: 'Bearer test-secret' },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.error).toBe('invalid_request_payload');
    expect(JSON.stringify(body)).not.toMatch(/stack|secret|resend|api[_-]?key/i);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rejects recipients outside the controlled test allowlist', async () => {
    const response = await POST(
      buildRequest(
        { to: 'external@gmail.com', template: 'welcome_onboarding' },
        { authorization: 'Bearer test-secret' },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'test_recipient_not_allowed' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 429 when the internal route authentication is rate limited', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue(
      allowedRateLimitResult({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      }),
    );

    const response = await POST(
      buildRequest(
        { to: 'qa@example.test', template: 'welcome_onboarding' },
        { authorization: 'Bearer test-secret' },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('retry-after')).toBeTruthy();
    expect(body.error).toBe('rate_limit_exceeded');
    expect(mocks.isAuthorizedInternalCronRequest).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('sends an allowed template to an allowed recipient after internal authorization', async () => {
    const response = await POST(
      buildRequest(
        { to: 'qa@example.test', template: 'security_alert', organizationName: 'Risck Comply QA' },
        { authorization: 'Bearer test-secret', 'x-forwarded-for': '198.51.100.99' },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({
      ok: true,
      template: 'security_alert',
      provider: 'resend',
      providerId: 'email_test_123',
      status: 'sent',
      attempts: 1,
    });
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'internal-email-test:route',
        ip: null,
        policy: 'health-internal',
        route: '/api/internal/email/test',
        action: 'send_test_email',
        limit: 5,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'qa@example.test',
        template: 'security_alert',
        metadata: expect.objectContaining({ source: 'internal_email_test_endpoint' }),
      }),
    );
  });
});
