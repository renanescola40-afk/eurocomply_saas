import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reportError: vi.fn(),
  logSecurityEvent: vi.fn(),
  validateBearerToken: vi.fn(),
  buildRateLimitSubjectFromRequest: vi.fn(() => ({
    action: 'observability.smoke',
    route: '/api/observability/smoke',
    subject: 'ip:test',
  })),
  checkDistributedRateLimit: vi.fn(),
  getRateLimitHeaders: vi.fn(() => ({ 'Retry-After': '60' })),
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/server/observability/logger', () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  requestIdFromHeaders: (headers: Headers) => headers.get('x-request-id') ?? 'req_unavailable',
}));

vi.mock('@/server/security/bearer-token', () => ({
  validateBearerToken: mocks.validateBearerToken,
}));

vi.mock('@/server/security/rate-limit', () => ({
  buildRateLimitSubjectFromRequest: mocks.buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  getRateLimitHeaders: mocks.getRateLimitHeaders,
}));

import { GET, POST } from './route';

function buildRequest(method: string, headers: Record<string, string> = {}) {
  return new Request('https://risckcomply.test/api/observability/smoke', {
    method,
    headers,
  });
}

describe('/api/observability/smoke', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    mocks.reportError.mockReset();
    mocks.logSecurityEvent.mockReset();
    mocks.validateBearerToken.mockReset();
    mocks.buildRateLimitSubjectFromRequest.mockClear();
    mocks.checkDistributedRateLimit.mockReset();
    mocks.getRateLimitHeaders.mockClear();
  });

  it('rejects requests without the healthcheck gate', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.validateBearerToken.mockReturnValue(false);

    const response = await POST(buildRequest('POST', { 'x-request-id': 'req_denied' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ status: 'unauthorized', requestId: 'req_denied' });
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith('security_denied', {
      requestId: 'req_denied',
      route: '/api/observability/smoke',
      reason: 'missing_or_invalid_healthcheck_token',
    });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('rate limits requests before credential validation', async () => {
    mocks.validateBearerToken.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: false });

    const response = await POST(buildRequest('POST', { 'x-request-id': 'req_limited' }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(body).toEqual({ error: 'Too many requests' });
    expect(mocks.validateBearerToken).not.toHaveBeenCalled();
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('fails closed before credential validation when the limiter is unavailable', async () => {
    mocks.validateBearerToken.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      failureMode: 'fail-closed',
      reason: 'backend_unavailable',
    });

    const response = await POST(buildRequest('POST', { 'x-request-id': 'req_unavailable' }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'security_control_unavailable' });
    expect(mocks.validateBearerToken).not.toHaveBeenCalled();
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('sends a smoke event and returns no internal report object', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    vi.stubEnv('SENTRY_DSN', '');
    mocks.validateBearerToken.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });

    const response = await POST(buildRequest('POST', { 'x-request-id': 'req_smoke' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ status: 'sent', provider: 'local_log', requestId: 'req_smoke' });
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('report');
    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(mocks.reportError.mock.calls[0][1]).toEqual({
      area: 'observability_smoke',
      route: '/api/observability/smoke',
      requestId: 'req_smoke',
      smokeTest: true,
    });
  });

  it('requires the healthcheck gate before returning the disabled GET response', async () => {
    mocks.validateBearerToken.mockReturnValue(false);

    const deniedResponse = GET(buildRequest('GET', { 'x-request-id': 'req_get_denied' }));
    const deniedBody = await deniedResponse.json();

    expect(deniedResponse.status).toBe(401);
    expect(deniedResponse.headers.get('cache-control')).toContain('no-store');
    expect(deniedBody).toEqual({ status: 'unauthorized', requestId: 'req_get_denied' });
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith('security_denied', {
      requestId: 'req_get_denied',
      route: '/api/observability/smoke',
      reason: 'missing_or_invalid_healthcheck_token',
    });

    mocks.validateBearerToken.mockReturnValue(true);

    const response = GET(buildRequest('GET', { 'x-request-id': 'req_get' }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({
      status: 'method_not_allowed',
      requestId: 'req_get',
      allowedMethods: ['POST'],
    });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });
});
