import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  tryCreateAdminClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: supabaseMock.tryCreateAdminClient,
}));

import {
  GET,
  enterpriseStepUpReadinessCheck,
  enterpriseStorageScannerCheck,
  readyEnvironmentCheck,
  sentryReleaseUploadCheck,
} from './route';

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
  vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', 'configured');
  vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'configured');
  vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', 'configured');
  vi.stubEnv('STRIPE_PRICE_STARTER_MONTHLY', '');
  vi.stubEnv('STRIPE_PRICE_STARTER_ANNUAL', '');
  vi.stubEnv('STRIPE_PRICE_GROWTH_MONTHLY', '');
  vi.stubEnv('STRIPE_PRICE_GROWTH_ANNUAL', '');
  vi.stubEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', '');
  vi.stubEnv('STRIPE_PRICE_BUSINESS_MONTHLY', '');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'configured');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
  vi.stubEnv('SENTRY_ORG', 'eurocomply');
  vi.stubEnv('SENTRY_PROJECT', 'saas');
  vi.stubEnv('SENTRY_AUTH_TOKEN', 'configured');
  vi.stubEnv('STEP_UP_PROVIDER_MODE', 'supabase_mfa');
  vi.stubEnv('STEP_UP_SIGNING_SECRET', 'configured-step-up-secret');
  vi.stubEnv('STEP_UP_IDP_ACR_VALUES', '');
  vi.stubEnv('STEP_UP_IDP_AMR_VALUES', '');
}

function stubNonEnterpriseRuntimeEnvironment() {
  vi.stubEnv('RELEASE_TARGET', '');
  vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', '');
  vi.stubEnv('EUROCOMPLY_ENTERPRISE_RELEASE', '');
  vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', '');
  vi.stubEnv('MALWARE_SCAN_REQUIRED', '');
  vi.stubEnv('MALWARE_SCANNER_PROVIDER', '');
  vi.stubEnv('MALWARE_SCANNER_ENDPOINT', '');
  vi.stubEnv('MALWARE_SCANNER_URL', '');
  vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', '');
  vi.stubEnv('MALWARE_SCANNER_CLAMAV_HOST', '');
  vi.stubEnv('MALWARE_SCANNER_CLAMAV_PORT', '');
  vi.stubEnv('STEP_UP_PROVIDER_MODE', '');
  vi.stubEnv('STEP_UP_SIGNING_SECRET', '');
  vi.stubEnv('AUDIT_CHAIN_SIGNING_SECRET', '');
  vi.stubEnv('STEP_UP_IDP_ACR_VALUES', '');
  vi.stubEnv('STEP_UP_IDP_AMR_VALUES', '');
}

function stubEnterpriseScannerEnvironment() {
  vi.stubEnv('RELEASE_TARGET', 'enterprise');
  vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', 'true');
  vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'true');
  vi.stubEnv('MALWARE_SCANNER_PROVIDER', 'http');
  vi.stubEnv('MALWARE_SCANNER_ENDPOINT', 'https://scanner.example/scan');
  vi.stubEnv('MALWARE_SCANNER_URL', '');
  vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', 'scanner.example');
}

describe('ready endpoint hardening', () => {
  beforeEach(() => {
    stubNonEnterpriseRuntimeEnvironment();
    supabaseMock.limit.mockResolvedValue({ error: null });
    supabaseMock.select.mockReturnValue({ limit: supabaseMock.limit });
    supabaseMock.from.mockReturnValue({ select: supabaseMock.select });
    supabaseMock.rpc.mockResolvedValue({
      data: [{ outcome: 'invalid_input', resource_record: null, current_count: 0, max_count: 0 }],
      error: null,
    });
    supabaseMock.tryCreateAdminClient.mockReturnValue({ from: supabaseMock.from, rpc: supabaseMock.rpc });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    supabaseMock.tryCreateAdminClient.mockReset();
    supabaseMock.from.mockReset();
    supabaseMock.select.mockReset();
    supabaseMock.limit.mockReset();
    supabaseMock.rpc.mockReset();
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

  it('treats blank readiness environment values as missing', () => {
    stubReadyEnvironment();
    vi.stubEnv('STRIPE_SECRET_KEY', '   ');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '\t');

    expect(readyEnvironmentCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: false,
        missingCount: 1,
      },
      {
        name: 'redis',
        configured: false,
        missingCount: 1,
      },
    ]));
  });

  it('rejects Starter and Growth legacy price fallbacks for canonical production readiness', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'configured');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'configured');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_STARTER_MONTHLY', 'configured');
    vi.stubEnv('STRIPE_PRICE_STARTER_ANNUAL', 'configured');
    vi.stubEnv('STRIPE_PRICE_GROWTH_MONTHLY', 'configured');
    vi.stubEnv('STRIPE_PRICE_GROWTH_ANNUAL', 'configured');

    expect(readyEnvironmentCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: false,
        missingCount: 4,
      },
    ]));
  });

  it('does not require Business or Enterprise fixed prices for application readiness', () => {
    stubReadyEnvironment();
    vi.stubEnv('STRIPE_PRICE_BUSINESS_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY', '');

    expect(readyEnvironmentCheck()).toEqual(expect.arrayContaining([
      {
        name: 'stripe',
        configured: true,
        missingCount: 0,
      },
    ]));
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
    expect(body.database).toMatchObject({
      adminClient: true,
      subscriptionsReadable: true,
      commercialMutationsReady: true,
      detail: 'ok',
    });
    expect(body.checks).toEqual({
      supabaseConfigured: true,
      databaseReachable: true,
      commercialMutationsReady: true,
      stripeConfigured: true,
      stripeApiReachable: true,
      redisConfigured: true,
      sentryConfigured: true,
      sentryObservabilityConfigured: true,
      enterpriseStepUpConfigured: true,
      enterpriseStorageScannerConfigured: true,
      healthcheckProtected: true,
    });
    expect(body.stripe).toEqual({
      configured: true,
      apiReachable: true,
      priceLookup: true,
      pricesChecked: 4,
      detail: 'ok',
    });
    expect(body.enterpriseStepUp).toEqual({
      required: false,
      configured: true,
      dedicatedSigningSecretConfigured: true,
      runtimeConfigurationConfigured: true,
    });
    expect(body.enterpriseStorageScanner).toEqual({
      required: false,
      configured: true,
      storageBucketConfigured: true,
      malwareScanningRequired: false,
      realScannerProviderConfigured: false,
      scannerTransportConfigured: false,
    });
    expect(body.sentryReleaseUploads.sourceMapsUploadRequiresAuthToken).toBe(true);
  });

  it('fails closed when the atomic commercial mutation RPC is unavailable', async () => {
    stubReadyEnvironment();
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    });

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.database).toMatchObject({
      adminClient: true,
      subscriptionsReadable: true,
      commercialMutationsReady: false,
      detail: 'not_ready',
    });
    expect(body.checks.databaseReachable).toBe(false);
    expect(body.checks.commercialMutationsReady).toBe(false);
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'mutate_commercial_resource_with_audit_atomic',
      expect.objectContaining({
        p_resource_type: 'vendor',
        p_operation: 'create',
        p_organization_id: null,
        p_actor_user_id: null,
      }),
    );
  });

  it('requires all four canonical self-serve Stripe prices to be present', async () => {
    stubReadyEnvironment();
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', '');

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.stripe).toMatchObject({
      configured: false,
      apiReachable: false,
      priceLookup: false,
      pricesChecked: 3,
      detail: 'not_configured',
    });
    expect(body.checks.stripeApiReachable).toBe(false);
  });

  it('requires a dedicated step-up signing secret for enterprise readiness', async () => {
    stubReadyEnvironment();
    stubEnterpriseScannerEnvironment();
    vi.stubEnv('AUDIT_CHAIN_SIGNING_SECRET', 'audit-chain-secret-must-not-satisfy-step-up-readiness');
    delete process.env.STEP_UP_SIGNING_SECRET;

    expect(enterpriseStepUpReadinessCheck()).toEqual({
      required: true,
      configured: false,
      dedicatedSigningSecretConfigured: false,
      runtimeConfigurationConfigured: true,
    });

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.enterpriseStepUp).toEqual({
      required: true,
      configured: false,
      dedicatedSigningSecretConfigured: false,
      runtimeConfigurationConfigured: true,
    });
    expect(body.checks.enterpriseStepUpConfigured).toBe(false);
    expect(serialized).not.toContain('STEP_UP_SIGNING_SECRET');
    expect(serialized).not.toContain('AUDIT_CHAIN_SIGNING_SECRET');
    expect(serialized).not.toContain('audit-chain-secret-must-not-satisfy-step-up-readiness');
  });

  it('requires storage and scanner readiness for enterprise releases', async () => {
    stubReadyEnvironment();
    vi.stubEnv('RELEASE_TARGET', 'enterprise');
    vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', 'true');
    vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'false');
    vi.stubEnv('MALWARE_SCANNER_PROVIDER', 'mock');

    expect(enterpriseStorageScannerCheck()).toEqual({
      required: true,
      configured: false,
      storageBucketConfigured: true,
      malwareScanningRequired: false,
      realScannerProviderConfigured: false,
      scannerTransportConfigured: false,
    });

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('not_ready');
    expect(body.checks.enterpriseStorageScannerConfigured).toBe(false);
    expect(JSON.stringify(body)).not.toContain('MALWARE_SCANNER_PROVIDER');
    expect(JSON.stringify(body)).not.toContain('MALWARE_SCANNER_ENDPOINT');
  });

  it('does not treat partial ClamAV transport configuration as enterprise-ready', () => {
    stubReadyEnvironment();
    vi.stubEnv('RELEASE_TARGET', 'enterprise');
    vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', 'true');
    vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'true');
    vi.stubEnv('MALWARE_SCANNER_PROVIDER', 'clamav');
    vi.stubEnv('MALWARE_SCANNER_CLAMAV_HOST', 'clamav.internal');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      required: true,
      configured: false,
      realScannerProviderConfigured: true,
      scannerTransportConfigured: false,
    });

    vi.stubEnv('MALWARE_SCANNER_CLAMAV_PORT', 'not-a-port');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      configured: false,
      scannerTransportConfigured: false,
    });

    vi.stubEnv('MALWARE_SCANNER_CLAMAV_PORT', '3310');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      configured: true,
      scannerTransportConfigured: true,
    });
  });

  it('requires non-empty HTTP scanner endpoint and allowed-host configuration', () => {
    stubReadyEnvironment();
    vi.stubEnv('RELEASE_TARGET', 'enterprise');
    vi.stubEnv('RISCK_COMPLY_ENTERPRISE_RELEASE', 'true');
    vi.stubEnv('REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'true');
    vi.stubEnv('MALWARE_SCANNER_PROVIDER', 'http');
    vi.stubEnv('MALWARE_SCANNER_ENDPOINT', '   ');
    vi.stubEnv('MALWARE_SCANNER_URL', '');
    vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', 'scanner.example');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      configured: false,
      scannerTransportConfigured: false,
    });

    vi.stubEnv('MALWARE_SCANNER_ENDPOINT', 'https://scanner.example/scan');
    vi.stubEnv('MALWARE_SCANNER_URL', '');
    vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', '   ');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      configured: false,
      scannerTransportConfigured: false,
    });

    vi.stubEnv('MALWARE_SCANNER_ALLOWED_HOSTS', 'scanner.example');

    expect(enterpriseStorageScannerCheck()).toMatchObject({
      configured: true,
      scannerTransportConfigured: true,
    });
  });

  it('passes enterprise storage, scanner, and step-up readiness when configured safely', async () => {
    stubReadyEnvironment();
    stubEnterpriseScannerEnvironment();

    expect(enterpriseStepUpReadinessCheck()).toEqual({
      required: true,
      configured: true,
      dedicatedSigningSecretConfigured: true,
      runtimeConfigurationConfigured: true,
    });
    expect(enterpriseStorageScannerCheck()).toEqual({
      required: true,
      configured: true,
      storageBucketConfigured: true,
      malwareScanningRequired: true,
      realScannerProviderConfigured: true,
      scannerTransportConfigured: true,
    });

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ready');
    expect(body.checks.enterpriseStepUpConfigured).toBe(true);
    expect(body.checks.enterpriseStorageScannerConfigured).toBe(true);
    expect(body.checks.commercialMutationsReady).toBe(true);
    expect(body.enterpriseStepUp.configured).toBe(true);
    expect(body.enterpriseStorageScanner.configured).toBe(true);
    expect(JSON.stringify(body)).not.toContain('configured-step-up-secret');
    expect(JSON.stringify(body)).not.toContain('https://scanner.example/scan');
    expect(JSON.stringify(body)).not.toContain('scanner.example');
  });

  it('returns grouped readiness gaps without listing individual env keys', async () => {
    vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_ESSENTIAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_STARTER_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_STARTER_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_GROWTH_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_GROWTH_ANNUAL', '');
    vi.stubEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', '');
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
        missingCount: 6,
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
