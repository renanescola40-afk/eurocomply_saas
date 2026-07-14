import Stripe from 'stripe';
import { reportError } from '@/lib/observability/report-error';
import { DOCUMENT_BUCKET } from '@/lib/documents/upload';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import {
  MALWARE_SCANNER_ENDPOINT_ENV,
  MALWARE_SCANNER_PROVIDER_ENV,
  MALWARE_SCANNER_URL_ENV,
  REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV,
} from '@/server/security/upload-security';
import { requireEnterpriseRateLimit } from '@/server/security/api-guards';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';
import { logSecurityEvent, requestIdFromHeaders } from '@/server/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_PRICE_ENV = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_GROWTH_MONTHLY',
  'STRIPE_PRICE_ENTERPRISE_MONTHLY',
] as const;

const LEGACY_STRIPE_PRICE_FALLBACKS = {
  STRIPE_PRICE_STARTER_MONTHLY: ['STRIPE_PRICE_ESSENTIAL_MONTHLY'],
  STRIPE_PRICE_GROWTH_MONTHLY: ['STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
  STRIPE_PRICE_ENTERPRISE_MONTHLY: ['STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
} as const;

const REQUIRED_ENV_GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', ...STRIPE_PRICE_ENV],
  redis: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  sentry: ['NEXT_PUBLIC_SENTRY_DSN'],
} as const;

const READINESS_DEPENDENCY_TIMEOUT_MS = 1_500;
const STRIPE_READINESS_TIMEOUT_MS = READINESS_DEPENDENCY_TIMEOUT_MS;
const TEST_PLACEHOLDER_VALUE = 'configured';
const SENTRY_RELEASE_UPLOAD_ENV = ['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'] as const;
const REAL_MALWARE_SCANNER_PROVIDERS = new Set(['clamav', 'clamd', 'http', 'generic-http', 'webhook']);
const HTTP_MALWARE_SCANNER_PROVIDERS = new Set(['http', 'generic-http', 'webhook']);
const CONTROLLED_DOCUMENT_BUCKET = 'controlled-documents';
const MIN_TCP_PORT = 1;
const MAX_TCP_PORT = 65_535;

class ReadinessDependencyTimeoutError extends Error {
  constructor() {
    super('Readiness dependency probe timed out');
    this.name = 'ReadinessDependencyTimeoutError';
  }
}

type EnvGroupName = keyof typeof REQUIRED_ENV_GROUPS;

type ReadyEnvironmentGroup = {
  name: EnvGroupName;
  configured: boolean;
  missingCount: number;
};

type EnterpriseStorageScannerCheck = {
  required: boolean;
  configured: boolean;
  storageBucketConfigured: boolean;
  malwareScanningRequired: boolean;
  realScannerProviderConfigured: boolean;
  scannerTransportConfigured: boolean;
};

type ReadyDatabaseCheck = {
  adminClient: boolean;
  subscriptionsReadable: boolean;
  detail: 'ok' | 'not_ready';
};

type ReadyStripeCheck = {
  configured: boolean;
  apiReachable: boolean;
  priceLookup: boolean;
  pricesChecked: number;
  detail: 'ok' | 'not_ready' | 'not_configured';
};

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

function configuredEnvValue(name: string) {
  const primary = process.env[name]?.trim();
  if (primary) return primary;

  const fallbacks = LEGACY_STRIPE_PRICE_FALLBACKS[name as keyof typeof LEGACY_STRIPE_PRICE_FALLBACKS] ?? [];
  for (const fallback of fallbacks) {
    const fallbackValue = process.env[fallback]?.trim();
    if (fallbackValue) return fallbackValue;
  }

  return '';
}

function hasConfiguredEnvValue(name: string) {
  return Boolean(configuredEnvValue(name));
}

function hasValidTcpPortEnv(name: string) {
  const rawPort = process.env[name]?.trim();
  if (!rawPort) return false;

  const port = Number(rawPort);
  return Number.isInteger(port) && port >= MIN_TCP_PORT && port <= MAX_TCP_PORT;
}

function configuredStripePriceIds() {
  return STRIPE_PRICE_ENV
    .map((variable) => configuredEnvValue(variable))
    .filter(Boolean);
}

function shouldUseMockStripeReadiness(secretKey: string, priceIds: string[]) {
  return process.env.NODE_ENV === 'test'
    && secretKey === TEST_PLACEHOLDER_VALUE
    && priceIds.length === STRIPE_PRICE_ENV.length
    && priceIds.every((priceId) => priceId === TEST_PLACEHOLDER_VALUE);
}

export async function withReadinessDependencyTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ReadinessDependencyTimeoutError()), READINESS_DEPENDENCY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function isEnterpriseReadinessRequired() {
  return process.env.RELEASE_TARGET === 'enterprise'
    || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true'
    || process.env[REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV] === 'true';
}

export function readyEnvironmentCheck(): ReadyEnvironmentGroup[] {
  return Object.entries(REQUIRED_ENV_GROUPS).map(([name, variables]) => {
    const missingCount = variables.filter((variable) => !hasConfiguredEnvValue(variable)).length;
    return {
      name: name as EnvGroupName,
      configured: missingCount === 0,
      missingCount,
    };
  });
}

export function sentryReleaseUploadCheck() {
  const missingCount = SENTRY_RELEASE_UPLOAD_ENV.filter((variable) => !process.env[variable]).length;
  return {
    configured: missingCount === 0,
    missingCount,
    sourceMapsUploadRequiresAuthToken: Boolean(process.env.SENTRY_AUTH_TOKEN),
  };
}

export function enterpriseStorageScannerCheck(): EnterpriseStorageScannerCheck {
  const required = isEnterpriseReadinessRequired();
  const provider = String(process.env[MALWARE_SCANNER_PROVIDER_ENV] ?? '').trim().toLowerCase();
  const malwareScanningRequired = process.env[REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV] === 'true';
  const realScannerProviderConfigured = REAL_MALWARE_SCANNER_PROVIDERS.has(provider);
  const scannerEndpointConfigured = hasConfiguredEnvValue(MALWARE_SCANNER_ENDPOINT_ENV)
    || hasConfiguredEnvValue(MALWARE_SCANNER_URL_ENV);
  const scannerAllowedHostsConfigured = hasConfiguredEnvValue('MALWARE_SCANNER_ALLOWED_HOSTS');
  const clamavTransportConfigured = hasConfiguredEnvValue('MALWARE_SCANNER_CLAMAV_HOST')
    && hasValidTcpPortEnv('MALWARE_SCANNER_CLAMAV_PORT');
  const scannerTransportConfigured = provider === 'clamav' || provider === 'clamd'
    ? clamavTransportConfigured
    : HTTP_MALWARE_SCANNER_PROVIDERS.has(provider) && scannerEndpointConfigured && scannerAllowedHostsConfigured;
  const storageBucketConfigured = DOCUMENT_BUCKET === CONTROLLED_DOCUMENT_BUCKET;

  return {
    required,
    configured: !required || (storageBucketConfigured && malwareScanningRequired && realScannerProviderConfigured && scannerTransportConfigured),
    storageBucketConfigured,
    malwareScanningRequired,
    realScannerProviderConfigured,
    scannerTransportConfigured,
  };
}

function checkConfigured(environment: ReadyEnvironmentGroup[], name: EnvGroupName) {
  return environment.find((item) => item.name === name)?.configured ?? false;
}

async function checkSupabaseConnectivity(): Promise<ReadyDatabaseCheck> {
  let database: ReadyDatabaseCheck = {
    adminClient: false,
    subscriptionsReadable: false,
    detail: 'not_ready',
  };

  try {
    const supabase = tryCreateAdminClient();
    database.adminClient = Boolean(supabase);

    if (supabase) {
      const query = supabase.from('subscriptions').select('id').limit(1);
      const { error } = await withReadinessDependencyTimeout(query);
      database = {
        adminClient: true,
        subscriptionsReadable: !error,
        detail: error ? 'not_ready' : 'ok',
      };
    }
  } catch (error) {
    reportError(error, { area: 'ready_supabase_check' });
    database = {
      adminClient: false,
      subscriptionsReadable: false,
      detail: 'not_ready',
    };
  }

  return database;
}

async function retrieveStripePriceForReadiness(stripe: Stripe, priceId: string) {
  return stripe.prices.retrieve(priceId, undefined, {
    timeout: STRIPE_READINESS_TIMEOUT_MS,
  });
}

async function checkStripeConnectivity(stripeConfigured: boolean): Promise<ReadyStripeCheck> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const priceIds = configuredStripePriceIds();

  if (!stripeConfigured || !secretKey || priceIds.length !== STRIPE_PRICE_ENV.length) {
    return {
      configured: stripeConfigured,
      apiReachable: false,
      priceLookup: false,
      pricesChecked: priceIds.length,
      detail: 'not_configured',
    };
  }

  if (shouldUseMockStripeReadiness(secretKey, priceIds)) {
    return {
      configured: true,
      apiReachable: true,
      priceLookup: true,
      pricesChecked: priceIds.length,
      detail: 'ok',
    };
  }

  try {
    const stripe = new Stripe(secretKey, {
      maxNetworkRetries: 0,
      timeout: STRIPE_READINESS_TIMEOUT_MS,
    });
    const prices = await Promise.all(priceIds.map((priceId) => retrieveStripePriceForReadiness(stripe, priceId)));
    const priceLookup = prices.length === STRIPE_PRICE_ENV.length && prices.every((price) => Boolean(price?.id));

    return {
      configured: stripeConfigured,
      apiReachable: priceLookup,
      priceLookup,
      pricesChecked: prices.length,
      detail: priceLookup ? 'ok' : 'not_ready',
    };
  } catch (error) {
    reportError(error, { area: 'ready_stripe_check' });

    return {
      configured: stripeConfigured,
      apiReachable: false,
      priceLookup: false,
      pricesChecked: priceIds.length,
      detail: 'not_ready',
    };
  }
}

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'health-internal',
    action: 'readiness_auth',
    route: '/api/ready',
    failureMode: 'fail-closed',
  });
  if (rateLimitDenied) return rateLimitDenied;

  if (!hasHealthcheckToken(request)) {
    logSecurityEvent('security_denied', {
      requestId,
      route: '/api/ready',
      reason: 'missing_or_invalid_healthcheck_token',
    });

    return noStoreJson({ status: 'unauthorized', requestId }, { status: 401 });
  }

  const environment = readyEnvironmentCheck();
  const database = await checkSupabaseConnectivity();
  const sentryReleaseUploads = sentryReleaseUploadCheck();
  const enterpriseStorageScanner = enterpriseStorageScannerCheck();

  const supabaseConfigured = checkConfigured(environment, 'supabase');
  const stripeConfigured = checkConfigured(environment, 'stripe');
  const redisConfigured = checkConfigured(environment, 'redis');
  const sentryConfigured = checkConfigured(environment, 'sentry');
  const stripe = await checkStripeConnectivity(stripeConfigured);
  const databaseReachable = database.adminClient && database.subscriptionsReadable;
  const stripeApiReachable = stripe.apiReachable && stripe.priceLookup;
  const enterpriseStorageScannerConfigured = enterpriseStorageScanner.configured;
  const ok = supabaseConfigured
    && stripeConfigured
    && redisConfigured
    && sentryConfigured
    && databaseReachable
    && stripeApiReachable
    && enterpriseStorageScannerConfigured;

  return noStoreJson(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      requestId,
      environment,
      database,
      stripe,
      sentryReleaseUploads,
      enterpriseStorageScanner,
      checks: {
        supabaseConfigured,
        databaseReachable,
        stripeConfigured,
        stripeApiReachable,
        redisConfigured,
        sentryConfigured,
        sentryObservabilityConfigured: sentryConfigured,
        enterpriseStorageScannerConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
