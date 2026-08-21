import billingCommercialCatalog from '../../../../../config/billing-commercial-catalog.json';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnterpriseRateLimit } from '@/server/security/api-guards';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';

const STRIPE_PRICE_ENV = [
  billingCommercialCatalog.plans.essential.monthlyPriceEnvKey,
  billingCommercialCatalog.plans.essential.annualPriceEnvKey,
  billingCommercialCatalog.plans.professional.monthlyPriceEnvKey,
  billingCommercialCatalog.plans.professional.annualPriceEnvKey,
] as const;

const REQUIRED_ENV_GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    ...STRIPE_PRICE_ENV,
  ],
} as const;

const OPS_SMOKE_DEPENDENCY_TIMEOUT_MS = 1_500;

type EnvGroupName = keyof typeof REQUIRED_ENV_GROUPS;

class OpsSmokeDependencyTimeoutError extends Error {
  constructor() {
    super('Operations smoke dependency probe timed out');
    this.name = 'OpsSmokeDependencyTimeoutError';
  }
}

function hasBearerToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

function hasRequiredEnv(variable: string) {
  return Boolean(process.env[variable]?.trim());
}

export function envGroupCheck() {
  return Object.entries(REQUIRED_ENV_GROUPS).map(([name, variables]) => {
    const missingCount = variables.filter((variable) => !hasRequiredEnv(variable)).length;
    return {
      name: name as EnvGroupName,
      configured: missingCount === 0,
      missingCount,
    };
  });
}

export async function withOpsSmokeDependencyTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new OpsSmokeDependencyTimeoutError()),
          OPS_SMOKE_DEPENDENCY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'health-internal',
    action: 'ops_smoke_auth',
    route: '/api/ops/smoke',
    failureMode: 'fail-closed',
  });
  if (rateLimitDenied) return rateLimitDenied;

  if (!hasBearerToken(request)) {
    return noStoreJson({ status: 'unauthorized' }, { status: 401 });
  }

  const environment = envGroupCheck();

  let supabase = { ok: false, detail: 'not_checked' };

  try {
    const admin = createAdminClient();
    const query = admin.from('subscriptions').select('id').limit(1);
    const { error } = await withOpsSmokeDependencyTimeout(query);
    supabase = error ? { ok: false, detail: error.code ?? 'query_failed' } : { ok: true, detail: 'ok' };
  } catch (error) {
    reportError(error, { area: 'ops_smoke_supabase_check' });
    supabase = { ok: false, detail: 'query_failed' };
  }

  const missingEnvironmentGroups = environment.filter((item) => !item.configured).map((item) => item.name);
  const ok = missingEnvironmentGroups.length === 0 && supabase.ok;

  return noStoreJson(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment,
      supabase,
      checks: {
        billingConfigured: environment.find((item) => item.name === 'stripe')?.configured ?? false,
        supabaseConfigured: environment.find((item) => item.name === 'supabase')?.configured ?? false,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
