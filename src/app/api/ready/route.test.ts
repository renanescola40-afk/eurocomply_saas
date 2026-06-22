import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  tryCreateAdminClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: supabaseMock.tryCreateAdminClient,
}));

import { GET, readyEnvironmentCheck, sentryReleaseUploadCheck } from './route';

function makeRequest(token?: string) {
  return new Request('https://app.eurocomply.example/api/ready', {
    headers: token
      ? {
          authorization: `Bearer ${token}`,
          'x-request-id': 'req_ready_test',
        }
      : {
          'x-request-id': 'req_ready_test',
        },
  });
}

function stubReadyEnvironment() {
  vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
  vi.stubEnv('STRIPE_SECRET_KEY', 'configured');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'configured');
  vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_BUSINESS_MONTHLY', 'configured');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'configured');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
  vi.stubEnv('SENTRY_ORG', 'eurocomply');
  vi.stubEnv('SENTRY_PROJECT', 'saas');
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'configured');
}

describe('ready endpoint hardening', () => {
  beforeEach(() => {
    supabaseMock.limit.mockResolvedValue({ error: null });
    supabaseMock.select.mockReturnValue({ limit: supabaseMock.limit });
    supabaseMock.from.mockReturnValue({ select: supabaseMock.select });
    supabaseMock.tryCreateAdminClient.mockReturnValue({ from: supabaseMock.from });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    supabaseMock.tryCreateAdminClient.mockReset();
    supabaseMock.from.mockReset();
    supabaseMock.select.mockReset();
    supabaseMock.limit.mockReset();
  });

  it('groups environment readiness without exposing individual variable names', () => {
    stubReadyEnvironment();

    expect(readyEnvironmentCheck()).toEqual([
      {
        name: 'supabase',
        configured: true,
        missingCount: 0,
      },
      {
        name: 'stripe',
        configured: true,
        missingCount: 0,
      },
      {
        name: 'redis',
        configured: true,
        missingCount: 0,
      },
      {
        name: 'sentry',
        configured: true,
        missingCount: 0,
      },
    ]);

    expect(sentryReleaseUploadCheck()).toEqual({
      configured: true,
      missingCount: 0,
      sourceMapsUploadRequiresAuthToken: true,
    });
  });

  it('fails without a healthcheck token', async () => {
    stubReadyEnvironment();
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ status: 'unauthorized', requestId: 'req_ready_test' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(spy).toHaveBeenCalled();
  });

  it('returns no-store unauthorized responses for the wrong token', async () => {
    stubReadyEnvironment();
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const response = await GET(makeRequest('wrong-token'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ status: 'unauthorized', requestId: 'req_ready_test' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(spy).toHaveBeenCalled();
  });

  it('passes with a valid token and configured dependencies', async () => {
    stubReadyEnvironment();

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.requestId).toBe('req_ready_test');
    expect(body.checks).toEqual({
      supabaseConfigured: true,
      databaseReachable: true,
      stripeConfigured: true,
      redisConfigured: true,
      sentryConfigured: true,
      healthcheckProtected: true,
    });
    expect(body.sentryReleaseUploads.sourceMapsUploadRequiresAuthToken).toBe(true);
  });

  it('returns grouped readiness gaps without listing individual env keys', async () => {
    vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_BUSINESS_MONTHLY', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    supabaseMock.tryCreateAdminClient.mockReturnValue(null);

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.environment).toEqual([
      {
        name: 'supabase',
        configured: false,
        missingCount: 3,
      },
      {
        name: 'stripe',
        configured: false,
        missingCount: 5,
      },
      {
        name: 'redis',
        configured: false,
        missingCount: 2,
      },
      {
        name: 'sentry',
        configured: false,
        missingCount: 1,
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(JSON.stringify(body)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(JSON.stringify(body)).not.toContain('STRIPE_SECRET_KEY');
    expect(JSON.stringify(body)).not.toContain('UPSTASH_REDIS_REST_TOKEN');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
