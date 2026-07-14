import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const MAINTENANCE_JOBS = [
  '/api/internal/metric-snapshots',
  '/api/internal/compliance-alerts',
  '/api/internal/trial-reminders',
  '/api/intelligence/refresh',
] as const;

const DAILY_MAINTENANCE_ROUTE = '/api/internal/daily-maintenance';
const DAILY_MAINTENANCE_AUTH_ACTION = 'authenticate_daily_maintenance';
const DEFAULT_JOB_TIMEOUT_MS = 25_000;

export function getConfiguredMaintenanceBaseUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredAppUrl) {
    return null;
  }

  try {
    const parsed = new URL(configuredAppUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    return parsed.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function resolveMaintenanceBaseUrl(request: Request) {
  const configuredBaseUrl = getConfiguredMaintenanceBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return new URL(request.url).origin.replace(/\/$/, '');
}

function getInternalCronCredential() {
  return process.env.CRON_SECRET ?? process.env.INTERNAL_CRON_SECRET ?? '';
}

function getMaintenanceJobTimeoutMs() {
  const configuredTimeout = Number(process.env.DAILY_MAINTENANCE_JOB_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return DEFAULT_JOB_TIMEOUT_MS;
}

async function runMaintenanceJob(baseUrl: string, path: string, credential: string) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getMaintenanceJobTimeoutMs());

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        'x-internal-cron-secret': credential,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return {
      path,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const authRateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: DAILY_MAINTENANCE_ROUTE,
    action: DAILY_MAINTENANCE_AUTH_ACTION,
  });
  if (authRateLimited) return authRateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const credential = getInternalCronCredential();
  if (!credential) {
    return noStoreJson({ error: 'Internal cron credential is not configured.' }, { status: 500 });
  }

  const baseUrl = resolveMaintenanceBaseUrl(request);
  if (!baseUrl) {
    return noStoreJson({ error: 'internal_maintenance_base_url_unavailable' }, { status: 503 });
  }

  const results = [];

  for (const path of MAINTENANCE_JOBS) {
    try {
      results.push(await runMaintenanceJob(baseUrl, path, credential));
    } catch (error) {
      reportError(error, { area: 'daily_maintenance_job', path });
      results.push({
        path,
        ok: false,
        status: 0,
        durationMs: 0,
        body: { error: 'job_failed' },
      });
    }
  }

  const failed = results.filter((result) => !result.ok);

  return noStoreJson({
    ok: failed.length === 0,
    jobs: results.length,
    failed: failed.length,
    results,
  }, { status: failed.length === 0 ? 200 : 207 });
}

export async function GET(request: Request) {
  return POST(request);
}
