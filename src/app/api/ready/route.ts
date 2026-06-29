import { reportError } from '@/lib/observability/report-error';
import { DOCUMENT_BUCKET } from '@/lib/documents/upload';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import {
  MALWARE_SCANNER_ENDPOINT_ENV,
  MALWARE_SCANNER_PROVIDER_ENV,
  MALWARE_SCANNER_URL_ENV,
  REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV,
} from '@/server/security/upload-security';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';
import { logSecurityEvent, requestIdFromHeaders } from '@/server/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_ENV_GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_BUSINESS_MONTHLY',
  ],
  redis: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  sentry: ['NEXT_PUBLIC_SENTRY_DSN'],
} as const;

const SENTRY_RELEASE_UPLOAD_ENV = ['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'] as const;
const REAL_MALWARE_SCANNER_PROVIDERS = new Set(['clamav', 'clamd', 'http', 'generic-http', 'webhook']);
const HTTP_MALWARE_SCANNER_PROVIDERS = new Set(['http', 'generic-http', 'webhook']);
const CONTROLLED_DOCUMENT_BUCKET = 'controlled-documents';
const MIN_TCP_PORT = 1;
const MAX_TCP_PORT = 65_535;

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

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

function hasConfiguredEnvValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasValidTcpPortEnv(name: string) {
  const rawPort = process.env[name]?.trim();
  if (!rawPort) return false;

  const port = Number(rawPort);
  return Number.isInteger(port) && port >= MIN_TCP_PORT && port <= MAX_TCP_PORT;
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
      const { error } = await supabase.from('subscriptions').select('id').limit(1);
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

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

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
  const databaseReachable = database.adminClient && database.subscriptionsReadable;
  const enterpriseStorageScannerConfigured = enterpriseStorageScanner.configured;
  const ok = supabaseConfigured
    && stripeConfigured
    && redisConfigured
    && sentryConfigured
    && databaseReachable
    && enterpriseStorageScannerConfigured;

  return noStoreJson(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      requestId,
      environment,
      database,
      sentryReleaseUploads,
      enterpriseStorageScanner,
      checks: {
        supabaseConfigured,
        databaseReachable,
        stripeConfigured,
        redisConfigured,
        sentryConfigured,
        enterpriseStorageScannerConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
