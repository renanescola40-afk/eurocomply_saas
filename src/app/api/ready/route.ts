import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
} as const;

type EnvGroupName = keyof typeof REQUIRED_ENV_GROUPS;

type ReadyEnvironmentGroup = {
  name: EnvGroupName;
  configured: boolean;
  missingCount: number;
};

function hasBearerToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN);
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

export async function GET(request: Request) {
  if (!hasBearerToken(request)) {
    return noStoreJson({ status: 'unauthorized' }, { status: 401 });
  }

  const environment = readyEnvironmentCheck();
  const supabaseConfigured = environment.find((item) => item.name === 'supabase')?.configured ?? false;

  let database = {
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

  const ok = supabaseConfigured && database.adminClient && database.subscriptionsReadable;

  return noStoreJson(
    {
      status: ok ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      environment,
      database,
      checks: {
        supabaseConfigured,
        databaseReachable: database.adminClient && database.subscriptionsReadable,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
