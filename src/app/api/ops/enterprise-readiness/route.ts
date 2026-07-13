import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnterpriseRateLimit } from '@/server/security/api-guards';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';

const REQUIRED_ENV_GROUPS = {
  app: ['NEXT_PUBLIC_APP_URL', 'HEALTHCHECK_TOKEN'],
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_BUSINESS_MONTHLY',
  ],
} as const;

const RECOMMENDED_ENV_GROUPS = {
  sentry: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'],
  rateLimit: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
} as const;

const REQUIRED_TABLES = [
  'organizations',
  'organization_members',
  'subscriptions',
  'documents',
  'vendors',
  'audit_events',
  'notifications',
  'organization_invites',
  'ai_systems',
  'ai_incidents',
] as const;

type RequiredTable = (typeof REQUIRED_TABLES)[number];
type DatabaseCheck = { name: RequiredTable; ok: boolean; detail: string };
type StorageCheck = { name: 'controlled-documents'; ok: boolean; detail: string };
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type DynamicSupabaseClient = SupabaseAdminClient & {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (count: number) => Promise<{ error: { code?: string; message?: string } | null }>;
    };
  };
};

function hasBearerToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

function envGroupCheck(groups: Record<string, readonly string[]>) {
  return Object.entries(groups).map(([name, variables]) => {
    const missingCount = variables.filter((variable) => !process.env[variable]).length;
    return {
      name,
      configured: missingCount === 0,
      missingCount,
    };
  });
}

async function checkTable<T extends RequiredTable>(admin: SupabaseAdminClient, table: T): Promise<{ name: T; ok: boolean; detail: string }> {
  try {
    const dynamicAdmin = admin as unknown as DynamicSupabaseClient;
    const { error } = await dynamicAdmin.from(table).select('id').limit(1);
    return {
      name: table,
      ok: !error,
      detail: error?.code ?? 'ok',
    };
  } catch (error) {
    reportError(error, { area: 'ops_enterprise_readiness_table_check', table });
    return {
      name: table,
      ok: false,
      detail: 'query_failed',
    };
  }
}

async function checkBucket(admin: SupabaseAdminClient, name: StorageCheck['name']): Promise<StorageCheck> {
  try {
    const { error } = await admin.storage.getBucket(name);
    return {
      name,
      ok: !error,
      detail: error ? 'bucket_unavailable' : 'ok',
    };
  } catch (error) {
    reportError(error, { area: 'ops_enterprise_readiness_storage_check', bucket: name });
    return {
      name,
      ok: false,
      detail: 'bucket_check_failed',
    };
  }
}

function calculateScore(checks: Array<{ ok: boolean; weight: number }>) {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const passed = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return total === 0 ? 0 : Math.round((passed / total) * 100);
}

export async function GET(request: Request) {
  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'health-internal',
    action: 'ops_enterprise_readiness_auth',
    route: '/api/ops/enterprise-readiness',
    failureMode: 'fail-closed',
  });
  if (rateLimitDenied) return rateLimitDenied;

  if (!hasBearerToken(request)) {
    return noStoreJson({ status: 'unauthorized' }, { status: 401 });
  }

  const requiredEnvironment = envGroupCheck(REQUIRED_ENV_GROUPS);
  const recommendedEnvironment = envGroupCheck(RECOMMENDED_ENV_GROUPS);
  const missingRequiredGroups = requiredEnvironment.filter((item) => !item.configured).map((item) => item.name);
  const missingRecommendedGroups = recommendedEnvironment.filter((item) => !item.configured).map((item) => item.name);

  let database: DatabaseCheck[] = REQUIRED_TABLES.map((name) => ({ name, ok: false, detail: 'not_checked' }));
  let storage: StorageCheck[] = [{ name: 'controlled-documents', ok: false, detail: 'not_checked' }];

  try {
    const admin = createAdminClient();
    database = await Promise.all(REQUIRED_TABLES.map((table) => checkTable(admin, table)));
    storage = [await checkBucket(admin, 'controlled-documents')];
  } catch (error) {
    reportError(error, { area: 'ops_enterprise_readiness_admin_client' });
    database = REQUIRED_TABLES.map((name) => ({ name, ok: false, detail: 'admin_client_unavailable' }));
    storage = [{ name: 'controlled-documents', ok: false, detail: 'admin_client_unavailable' }];
  }

  const databaseOk = database.every((item) => item.ok);
  const storageOk = storage.every((item) => item.ok);
  const requiredEnvironmentOk = missingRequiredGroups.length === 0;
  const sentryReleaseUploadsConfigured = recommendedEnvironment.find((item) => item.name === 'sentry')?.configured ?? false;
  const rateLimitConfigured = recommendedEnvironment.find((item) => item.name === 'rateLimit')?.configured ?? false;

  const score = calculateScore([
    { ok: requiredEnvironmentOk, weight: 25 },
    { ok: databaseOk, weight: 30 },
    { ok: storageOk, weight: 15 },
    { ok: sentryReleaseUploadsConfigured, weight: 15 },
    { ok: rateLimitConfigured, weight: 10 },
    { ok: process.env.NODE_ENV === 'production' ? Boolean(process.env.HEALTHCHECK_TOKEN) : true, weight: 5 },
  ]);

  const status = score >= 90 ? 'enterprise_ready' : score >= 70 ? 'production_ready_with_gaps' : 'needs_attention';

  return noStoreJson(
    {
      status,
      score,
      timestamp: new Date().toISOString(),
      requiredEnvironment,
      recommendedEnvironment,
      missingRequiredGroups,
      missingRecommendedGroups,
      database,
      storage,
      controls: {
        billingConfigured: requiredEnvironment.find((item) => item.name === 'stripe')?.configured ?? false,
        sentryReleaseUploadsConfigured,
        rateLimitConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
        aiGovernanceTablesReady: database.filter((item) => ['ai_systems', 'ai_incidents'].includes(item.name)).every((item) => item.ok),
      },
      nextActions: [
        ...missingRequiredGroups.map((name) => `Configure required environment group: ${name}`),
        ...database.filter((item) => !item.ok).map((item) => `Apply or refresh Supabase migration for table: ${item.name}`),
        ...storage.filter((item) => !item.ok).map((item) => `Create or verify private storage bucket: ${item.name}`),
        ...(sentryReleaseUploadsConfigured ? [] : ['Configure Sentry release uploads']),
        ...(rateLimitConfigured ? [] : ['Configure Upstash Redis rate limiting']),
      ],
    },
    { status: score >= 70 ? 200 : 503 },
  );
}
