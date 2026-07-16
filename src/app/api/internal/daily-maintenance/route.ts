import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { internalBatchResponse } from '@/server/jobs/internal-batch-response';
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
const MAX_JOB_RESPONSE_BYTES = 64 * 1024;

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

export async function readBoundedMaintenanceJobResponse(response: Response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JOB_RESPONSE_BYTES) {
    await response.body?.cancel();
    return { body: { error: 'job_response_too_large' }, tooLarge: true };
  }

  if (!response.body) {
    return { body: null, tooLarge: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JOB_RESPONSE_BYTES) {
        await reader.cancel();
        return { body: { error: 'job_response_too_large' }, tooLarge: true };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { body: text ? (JSON.parse(text) as unknown) : null, tooLarge: false };
  } catch {
    return { body: null, tooLarge: false };
  }
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

    const parsedResponse = await readBoundedMaintenanceJobResponse(response);

    return {
      path,
      ok: response.ok && !parsedResponse.tooLarge,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body: parsedResponse.body,
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
    const startedAt = Date.now();

    try {
      results.push(await runMaintenanceJob(baseUrl, path, credential));
    } catch (error) {
      reportError(error, { area: 'daily_maintenance_job', path });
      results.push({
        path,
        ok: false,
        status: 0,
        durationMs: Date.now() - startedAt,
        body: { error: 'job_failed' },
      });
    }
  }

  const failed = results.filter((result) => !result.ok);

  return internalBatchResponse({
    failureCount: failed.length,
    failureMessage: 'One or more maintenance jobs failed',
    failureStatus: 207,
    summary: {
      jobs: results.length,
      failed: failed.length,
      results,
    },
  });
}

export async function GET(request: Request) {
  return POST(request);
}
