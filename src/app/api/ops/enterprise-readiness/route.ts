import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const REQUIRED_ENV = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'HEALTHCHECK_TOKEN',
] as const;

const RECOMMENDED_ENV = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

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

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type DynamicSupabaseClient = SupabaseAdminClient & {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (count: number) => Promise<{ error: { code?: string; message?: string } | null }>;
    };
  };
};

function hasBearerToken(request: Request) {
  const configuredToken = process.env.HEALTHCHECK_TOKEN;

  if (process.env.NODE_ENV !== 'production' && !configuredToken) {
    return true;
  }

  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  return authorization === `Bearer ${configuredToken}`;
}

function envCheck(names: readonly string[]) {
  return names.map((name) => ({ name, configured: Boolean(process.env[name]) }));
}

async function checkTable(admin: SupabaseAdminClient, table: string) {
  try {
    const dynamicAdmin = admin as unknown as DynamicSupabaseClient;
    const { error } = await dynamicAdmin.from(table).select('id').limit(1);
    return {
      name: table,
      ok: !error,
      detail: error?.code ?? 'ok',
    };
  } catch (error) {
    return {
      name: table,
      ok: false,
      detail: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

async function checkBucket(admin: SupabaseAdminClient, name: string) {
  try {
    const { error } = await admin.storage.getBucket(name);
    return {
      name,
      ok: !error,
      detail: error?.message ?? 'ok',
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

function calculateScore(checks: Array<{ ok: boolean; weight: number }>) {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const passed = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return total === 0 ? 0 : Math.round((passed / total) * 100);
}

export async function GET(request: Request) {
  if (!hasBearerToken(request)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const requiredEnv = envCheck(REQUIRED_ENV);
  const recommendedEnv = envCheck(RECOMMENDED_ENV);
  const missingRequiredEnv = requiredEnv.filter((item) => !item.configured).map((item) => item.name);
  const missingRecommendedEnv = recommendedEnv.filter((item) => !item.configured).map((item) => item.name);

  let database = REQUIRED_TABLES.map((name) => ({ name, ok: false, detail: 'not_checked' }));
  let storage = [{ name: 'controlled-documents', ok: false, detail: 'not_checked' }];

  try {
    const admin = createAdminClient();
    database = await Promise.all(REQUIRED_TABLES.map((table) => checkTable(admin, table)));
    storage = [await checkBucket(admin, 'controlled-documents')];
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'admin_client_unavailable';
    database = REQUIRED_TABLES.map((name) => ({ name, ok: false, detail }));
    storage = [{ name: 'controlled-documents', ok: false, detail }];
  }

  const databaseOk = database.every((item) => item.ok);
  const storageOk = storage.every((item) => item.ok);
  const requiredEnvOk = missingRequiredEnv.length === 0;
  const sentryReleaseUploadsConfigured = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
  );
  const rateLimitConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  const score = calculateScore([
    { ok: requiredEnvOk, weight: 25 },
    { ok: databaseOk, weight: 30 },
    { ok: storageOk, weight: 15 },
    { ok: sentryReleaseUploadsConfigured, weight: 15 },
    { ok: rateLimitConfigured, weight: 10 },
    { ok: process.env.NODE_ENV === 'production' ? Boolean(process.env.HEALTHCHECK_TOKEN) : true, weight: 5 },
  ]);

  const status = score >= 90 ? 'enterprise_ready' : score >= 70 ? 'production_ready_with_gaps' : 'needs_attention';

  return NextResponse.json(
    {
      status,
      score,
      timestamp: new Date().toISOString(),
      requiredEnv,
      recommendedEnv,
      missingRequiredEnv,
      missingRecommendedEnv,
      database,
      storage,
      controls: {
        billingConfigured: REQUIRED_ENV.filter((name) => name.startsWith('STRIPE_')).every((name) => Boolean(process.env[name])),
        sentryReleaseUploadsConfigured,
        rateLimitConfigured,
        healthcheckProtected: Boolean(process.env.HEALTHCHECK_TOKEN),
        aiGovernanceTablesReady: database.filter((item) => ['ai_systems', 'ai_incidents'].includes(item.name)).every((item) => item.ok),
      },
      nextActions: [
        ...missingRequiredEnv.map((name) => `Configure required environment variable: ${name}`),
        ...database.filter((item) => !item.ok).map((item) => `Apply or refresh Supabase migration for table: ${item.name}`),
        ...storage.filter((item) => !item.ok).map((item) => `Create or verify private storage bucket: ${item.name}`),
        ...(sentryReleaseUploadsConfigured ? [] : ['Configure Sentry release uploads with SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN']),
        ...(rateLimitConfigured ? [] : ['Configure Upstash Redis rate limiting for production abuse protection']),
      ],
    },
    { status: score >= 70 ? 200 : 503 },
  );
}
