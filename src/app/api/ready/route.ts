import Stripe from 'stripe';
import billingCommercialCatalog from '../../../../config/billing-commercial-catalog.json';
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
import { isEnterpriseStepUpConfigured } from '@/server/security/step-up';
import { logSecurityEvent, requestIdFromHeaders } from '@/server/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeReadinessPlanId = 'essential' | 'professional';
type StripeReadinessInterval = 'month' | 'year';

export type StripeReadinessBinding = {
  envKey: string;
  publicPlanId: StripeReadinessPlanId;
  interval: StripeReadinessInterval;
  expectedAmountCents: number;
};

const essentialCatalog = billingCommercialCatalog.plans.essential;
const professionalCatalog = billingCommercialCatalog.plans.professional;

export const CANONICAL_STRIPE_READINESS_BINDINGS: readonly StripeReadinessBinding[] = [
  {
    envKey: essentialCatalog.monthlyPriceEnvKey,
    publicPlanId: 'essential',
    interval: 'month',
    expectedAmountCents: essentialCatalog.monthlyPriceCents,
  },
  {
    envKey: essentialCatalog.annualPriceEnvKey,
    publicPlanId: 'essential',
    interval: 'year',
    expectedAmountCents: essentialCatalog.annualPriceCents,
  },
  {
    envKey: professionalCatalog.monthlyPriceEnvKey,
    publicPlanId: 'professional',
    interval: 'month',
    expectedAmountCents: professionalCatalog.monthlyPriceCents,
  },
  {
    envKey: professionalCatalog.annualPriceEnvKey,
    publicPlanId: 'professional',
    interval: 'year',
    expectedAmountCents: professionalCatalog.annualPriceCents,
  },
];

const STRIPE_PRICE_ENV = CANONICAL_STRIPE_READINESS_BINDINGS.map((binding) => binding.envKey);

const REQUIRED_ENV_GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', ...STRIPE_PRICE_ENV],
  redis: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  sentry: ['NEXT_PUBLIC_SENTRY_DSN'],
} as const;

// Production provider calls can legitimately exceed 1.5s during cold/network paths.
// Keep the probe bounded and fail-closed, but allow enough time to distinguish
// normal provider latency from an unavailable dependency.
const READINESS_DEPENDENCY_TIMEOUT_MS = 5_000;
const STRIPE_READINESS_TIMEOUT_MS = READINESS_DEPENDENCY_TIMEOUT_MS;
const TEST_PLACEHOLDER_VALUE = 'configured';
const COMMERCIAL_RESOURCE_ATOMIC_RPC = 'mutate_commercial_resource_with_audit_atomic';
// SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN are build/control-plane
// inputs for release/source-map uploads. They stay informational here because
// runtime health is proven by NEXT_PUBLIC_SENTRY_DSN; the protected provider
// proof validates the build/control-plane Sentry integration separately.
const SENTRY_RELEASE_BUILD_ENV = ['SENTRY_ORG', 'SENTRY_PROJECT'] as const;
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

type EnterpriseStepUpReadinessCheck = {
  required: boolean;
  configured: boolean;
  dedicatedSigningSecretConfigured: boolean;
  runtimeConfigurationConfigured: boolean;
};

type ReadyDatabaseCheck = {
  adminClient: boolean;
  subscriptionsReadable: boolean;
  commercialMutationsReady: boolean;
  detail: 'ok' | 'not_ready';
};

type ReadyStripeCheck = {
  configured: boolean;
  apiReachable: boolean;
  priceLookup: boolean;
  pricesChecked: number;
  detail: 'ok' | 'not_ready' | 'not_configured';
};

type ConfiguredStripeReadinessBinding = StripeReadinessBinding & {
  priceId: string;
};

type CommercialMutationProbeRow = {
  outcome?: unknown;
};

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

function configuredEnvValue(name: string) {
  return process.env[name]?.trim() ?? '';
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

function configuredStripePriceBindings(): ConfiguredStripeReadinessBinding[] {
  return CANONICAL_STRIPE_READINESS_BINDINGS
    .map((binding) => ({
      ...binding,
      priceId: configuredEnvValue(binding.envKey),
    }))
    .filter((binding) => Boolean(binding.priceId));
}

function shouldUseMockStripeReadiness(secretKey: string, bindings: ConfiguredStripeReadinessBinding[]) {
  return process.env.NODE_ENV === 'test'
    && secretKey === TEST_PLACEHOLDER_VALUE
    && bindings.length === CANONICAL_STRIPE_READINESS_BINDINGS.length
    && bindings.every((binding) => binding.priceId === TEST_PLACEHOLDER_VALUE);
}

export function isCanonicalStripePriceForReadiness(
  price: Stripe.Price,
  binding: StripeReadinessBinding,
) {
  const product = price.product;
  const expandedProduct = typeof product === 'object'
    && product !== null
    && !('deleted' in product)
    ? product
    : null;

  return price.livemode === true
    && price.active === true
    && price.type === 'recurring'
    && price.recurring?.interval === binding.interval
    && price.recurring?.interval_count === 1
    && String(price.currency ?? '').toLowerCase() === String(billingCommercialCatalog.currency).toLowerCase()
    && price.unit_amount === binding.expectedAmountCents
    && expandedProduct?.active === true
    && expandedProduct.metadata?.billing_plan_id === binding.publicPlanId
    && expandedProduct.metadata?.catalog_status === 'canonical_live';
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
  const missingCount = SENTRY_RELEASE_BUILD_ENV.filter((variable) => !hasConfiguredEnvValue(variable)).length;
  return {
    configured: missingCount === 0,
    missingCount,
    sourceMapsUploadRequiresAuthToken: true,
  };
}

export function enterpriseStepUpReadinessCheck(): EnterpriseStepUpReadinessCheck {
  const required = isEnterpriseReadinessRequired();
  const dedicatedSigningSecretConfigured = hasConfiguredEnvValue('STEP_UP_SIGNING_SECRET');
  const runtimeConfigurationConfigured = isEnterpriseStepUpConfigured();

  return {
    required,
    configured: !required || (dedicatedSigningSecretConfigured && runtimeConfigurationConfigured),
    dedicatedSigningSecretConfigured,
    runtimeConfigurationConfigured,
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

function isCommercialMutationProbeReady(data: unknown) {
  if (!Array.isArray(data) || data.length !== 1) return false;
  const row = data[0] as CommercialMutationProbeRow | null;
  return Boolean(row && typeof row === 'object' && row.outcome === 'invalid_input');
}

async function checkSupabaseConnectivity(): Promise<ReadyDatabaseCheck> {
  let database: ReadyDatabaseCheck = {
    adminClient: false,
    subscriptionsReadable: false,
    commercialMutationsReady: false,
    detail: 'not_ready',
  };

  try {
    const supabase = tryCreateAdminClient();
    database.adminClient = Boolean(supabase);

    if (supabase) {
      const subscriptionsQuery = supabase.from('subscriptions').select('id').limit(1);
      const commercialMutationProbe = supabase.rpc(COMMERCIAL_RESOURCE_ATOMIC_RPC, {
        p_resource_type: 'vendor',
        p_operation: 'create',
        p_organization_id: null,
        p_actor_user_id: null,
        p_entity_id: null,
        p_payload: null,
        p_max_count: 0,
        p_expected_review_version: null,
        p_audit_id: null,
        p_audit_metadata: {},
        p_audit_created_at: null,
        p_previous_hash: null,
        p_event_hash: 'invalid-readiness-probe',
        p_hash_signature: null,
      });
      const [subscriptions, commercialMutation] = await Promise.all([
        withReadinessDependencyTimeout(subscriptionsQuery),
        withReadinessDependencyTimeout(commercialMutationProbe),
      ]);
      const subscriptionsReadable = !subscriptions.error;
      const commercialMutationsReady = !commercialMutation.error && isCommercialMutationProbeReady(commercialMutation.data);
      database = {
        adminClient: true,
        subscriptionsReadable,
        commercialMutationsReady,
        detail: subscriptionsReadable && commercialMutationsReady ? 'ok' : 'not_ready',
      };
    }
  } catch (error) {
    reportError(error, { area: 'ready_supabase_check' });
    database = {
      adminClient: false,
      subscriptionsReadable: false,
      commercialMutationsReady: false,
      detail: 'not_ready',
    };
  }

  return database;
}

async function retrieveStripePriceForReadiness(stripe: Stripe, priceId: string) {
  return stripe.prices.retrieve(priceId, { expand: ['product'] }, {
    timeout: STRIPE_READINESS_TIMEOUT_MS,
  });
}

async function checkStripeConnectivity(stripeConfigured: boolean): Promise<ReadyStripeCheck> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const bindings = configuredStripePriceBindings();

  if (!stripeConfigured || !secretKey || bindings.length !== CANONICAL_STRIPE_READINESS_BINDINGS.length) {
    return {
      configured: stripeConfigured,
      apiReachable: false,
      priceLookup: false,
      pricesChecked: bindings.length,
      detail: 'not_configured',
    };
  }

  if (shouldUseMockStripeReadiness(secretKey, bindings)) {
    return {
      configured: true,
      apiReachable: true,
      priceLookup: true,
      pricesChecked: bindings.length,
      detail: 'ok',
    };
  }

  try {
    const stripe = new Stripe(secretKey, {
      maxNetworkRetries: 0,
      timeout: STRIPE_READINESS_TIMEOUT_MS,
    });
    const prices = await Promise.all(bindings.map(async (binding) => ({
      binding,
      price: await retrieveStripePriceForReadiness(stripe, binding.priceId),
    })));
    const priceLookup = prices.length === CANONICAL_STRIPE_READINESS_BINDINGS.length
      && prices.every(({ price, binding }) => isCanonicalStripePriceForReadiness(price, binding));

    return {
      configured: stripeConfigured,
      apiReachable: true,
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
      pricesChecked: bindings.length,
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
  const enterpriseStepUp = enterpriseStepUpReadinessCheck();
  const enterpriseStorageScanner = enterpriseStorageScannerCheck();

  const supabaseConfigured = checkConfigured(environment, 'supabase');
  const stripeConfigured = checkConfigured(environment, 'stripe');
  const redisConfigured = checkConfigured(environment, 'redis');
  const sentryConfigured = checkConfigured(environment, 'sentry');
  const stripe = await checkStripeConnectivity(stripeConfigured);
  const commercialMutationsReady = database.commercialMutationsReady;
  const databaseReachable = database.adminClient && database.subscriptionsReadable && commercialMutationsReady;
  const stripeApiReachable = stripe.apiReachable && stripe.priceLookup;
  const enterpriseStepUpConfigured = enterpriseStepUp.configured;
  const enterpriseStorageScannerConfigured = enterpriseStorageScanner.configured;
  const ok = supabaseConfigured
    && stripeConfigured
    && redisConfigured
    && sentryConfigured
    && databaseReachable
    && stripeApiReachable
    && enterpriseStepUpConfigured
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
      enterpriseStepUp,
      enterpriseStorageScanner,
      checks: {
        supabaseConfigured,
        databaseReachable,
        commercialMutationsReady,
        stripeConfigured,
        stripeApiReachable,
        redisConfigured,
        sentryConfigured,
        sentryObservabilityConfigured: sentryConfigured,
        enterpriseStepUpConfigured,
        enterpriseStorageScannerConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
