import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const guardMock = vi.hoisted(() => ({
  requireEnterpriseRateLimit: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  logSecurityEvent: vi.fn(),
  requestIdFromHeaders: vi.fn(() => 'req_release_metadata_test'),
}));

vi.mock('@/server/security/api-guards', () => ({
  requireEnterpriseRateLimit: guardMock.requireEnterpriseRateLimit,
}));

vi.mock('@/server/observability/logger', () => ({
  logSecurityEvent: loggerMock.logSecurityEvent,
  requestIdFromHeaders: loggerMock.requestIdFromHeaders,
}));

import { GET } from './route';

const SHA = 'a'.repeat(40);

function makeRequest(token?: string) {
  return new Request('https://app.example/api/ready/release', {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe('protected runtime release metadata endpoint', () => {
  beforeEach(() => {
    guardMock.requireEnterpriseRateLimit.mockResolvedValue(null);
    vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', SHA);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    guardMock.requireEnterpriseRateLimit.mockReset();
    loggerMock.logSecurityEvent.mockReset();
  });

  it('rejects anonymous requests with no-store', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({
      status: 'unauthorized',
      requestId: 'req_release_metadata_test',
    });
    expect(loggerMock.logSecurityEvent).toHaveBeenCalled();
  });

  it('returns sanitized runtime release metadata for an authorized request', async () => {
    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({
      status: 'ok',
      requestId: 'req_release_metadata_test',
      release: {
        available: true,
        commitSha: SHA,
        provenance: 'vercel',
      },
    });
    expect(JSON.stringify(body)).not.toContain('VERCEL_GIT_COMMIT_SHA');
  });

  it('fails closed when runtime commit metadata is unavailable', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'malformed');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('RELEASE_BUILD_SHA', '');
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', '');

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.release).toEqual({
      available: false,
      commitSha: null,
      provenance: 'unavailable',
    });
  });

  it('returns the fail-closed rate-limit response before authentication', async () => {
    guardMock.requireEnterpriseRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ status: 'unavailable' }), {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      }),
    );

    const response = await GET(makeRequest('expected-token'));

    expect(response.status).toBe(503);
    expect(loggerMock.logSecurityEvent).not.toHaveBeenCalled();
  });
});
