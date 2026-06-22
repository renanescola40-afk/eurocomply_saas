import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
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

type EnvGroupName = keyof typeof REQUIRED_ENV_GROUPS;

type ReadyEnvironmentGroup = {
  name: EnvGroupName;
  configured: boolean;
  missingCount: number;
};

type ReadyDatabaseCheck = {
  adminClient: boolean;
  subscriptionsReadable: boolean;
  detail: string;
};

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

export function readyEnvironmentCheck(): ReadyEnvironmentGroup[] {
  return Object.entries(REQUIRED_ENV_GROUPS).map(([name, variables]) => {
    const missingCount = variables.filter((variable) => !process.env[variable]).length;
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

function checkConfigured(environment: ReadyEnvironmentGroup[], name: EnvGroupName) {
  return environment.find((item) => item.name === name)?.configured ?? false;
}

async function checkSupabaseConnectivity(): Promise<ReadyDatabaseCheck> {
  let database: ReadyDatabaseCheck = {
    adminClient: false,
    subscriptionsReadable: false,
    detail: 'not_checked',
  };

  try {
    const supabase = tryCreateAdminClient();
    database.adminClient = Boolean(supabase);

    if (supabase) {
      const { error } = await supabase.from('subscriptions').select('id').limit(1);
      database = {
        adminClient: true,
        subscriptionsReadable: !error,
        detail: error ? error.code ?? 'query_failed' : 'ok',
      };
    } else {
      database.detail = 'admin_client_unavailable';
    }
  } catch (error) {
    reportError(error, { area: 'ready_supabase_check' });
    database = {
      adminClient: false,
      subscriptionsReadable: false,
      detail: 'query_failed',
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

  const supabaseConfigured = checkConfigured(environment, 'supabase');
  const stripeConfigured = checkConfigured(environment, 'stripe');
  const redisConfigured = checkConfigured(environment, 'redis');
  const sentryConfigured = checkConfigured(environment, 'sentry');
  const databaseReachable = database.adminClient && database.subscriptionsReadable;
  const ok = supabaseConfigured && stripeConfigured && redisConfigured && sentryConfigured && databaseReachable;

  return noStoreJson(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      requestId,
      environment,
      database,
      sentryReleaseUploads,
      checks: {
        supabaseConfigured,
        databaseReachable,
        stripeConfigured,
        redisConfigured,
        sentryConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
