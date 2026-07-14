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

import { GET, sentryReleaseUploadCheck } from './route';

function makeRequest() {
  return new Request('https://app.eurocomply.example/api/ready', {
    headers: {
      authorization: 'Bearer expected-token',
      'x-request-id': 'req_sentry_release_readiness',
    },
  });
}

function stubBaseEnvironment() {
  vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
  vi.stubEnv('STRIPE_SECRET_KEY', 'configured');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'configured');
  vi.stubEnv('STRIPE_PRICE_STARTER_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_GROWTH_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'configured');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'configured');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
  vi.stubEnv('SENTRY_ORG', '');
  vi.stubEnv('SENTRY_PROJECT', '   ');
  vi.stubEnv('SENTRY_AUTH_TOKEN', '');
  vi.stubEnv('RELEASE_TARGET', '');
  vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', '');
  vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', '');
  vi.stubEnv('MALWARE_SCANNER_PROVIDER', '');
  vi.stubEnv('MALWARE_SCANNER_ENDPOINT', '');
  vi.stubEnv('MALWARE_SCANNER_URL', '');
  vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', '');
}

function stubEnterpriseScanner() {
  vi.stubEnv('RELEASE_TARGET', 'enterprise');
  vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', 'true');
  vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'true');
  vi.stubEnv('MALWARE_SCANNER_PROVIDER', 'http');
  vi.stubEnv('MALWARE_SCANNER_ENDPOINT', 'https://scanner.example/scan');
  vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', 'scanner.example');
}

describe('enterprise Sentry release upload readiness', () => {
  beforeEach(() => {
    stubBaseEnvironment();
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

  it('does not block public readiness when release upload credentials are absent', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.sentryReleaseUploads).toEqual({
      configured: false,
      missingCount: 3,
      sourceMapsUploadRequiresAuthToken: false,
    });
    expect(body.checks.sentryReleaseUploadsConfigured).toBe(true);
  });

  it('fails enterprise readiness when release upload credentials are absent or blank', async () => {
    stubEnterpriseScanner();

    expect(sentryReleaseUploadCheck()).toEqual({
      configured: false,
      missingCount: 3,
      sourceMapsUploadRequiresAuthToken: false,
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.checks.sentryReleaseUploadsConfigured).toBe(false);
    expect(JSON.stringify(body)).not.toContain('SENTRY_AUTH_TOKEN');
    expect(JSON.stringify(body)).not.toContain('SENTRY_ORG');
    expect(JSON.stringify(body)).not.toContain('SENTRY_PROJECT');
  });

  it('passes enterprise readiness when release upload credentials are non-blank', async () => {
    stubEnterpriseScanner();
    vi.stubEnv('SENTRY_ORG', 'risck-comply');
    vi.stubEnv('SENTRY_PROJECT', 'web');
    vi.stubEnv('SENTRY_AUTH_TOKEN', 'configured');

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.sentryReleaseUploads.configured).toBe(true);
    expect(body.checks.sentryReleaseUploadsConfigured).toBe(true);
  });
});
