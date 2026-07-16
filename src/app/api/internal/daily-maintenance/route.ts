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

type MaintenanceJobResponseFailure =
  | 'job_response_too_large'
  | 'job_response_invalid_content_length'
  | 'job_response_body_missing'
  | 'job_response_read_failed'
  | 'job_response_invalid_utf8'
  | 'job_response_invalid_json'
  | 'job_response_invalid_json_shape';

export type MaintenanceJobResponseReadResult = {
  body: Record<string, unknown> | null;
  failure: MaintenanceJobResponseFailure | null;
};

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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function maintenanceJobResponseFailure(failure: MaintenanceJobResponseFailure): MaintenanceJobResponseReadResult {
  return { body: { error: failure }, failure };
}

async function cancelMaintenanceResponseBody(response: Response, reason: MaintenanceJobResponseFailure) {
  await response.body?.cancel(reason).catch(() => undefined);
}

export async function readBoundedMaintenanceJobResponse(response: Response): Promise<MaintenanceJobResponseReadResult> {
  const declaredLengthHeader = response.headers.get('content-length');

  if (declaredLengthHeader !== null) {
    const normalizedLength = declaredLengthHeader.trim();
    const declaredLength = Number(normalizedLength);

    if (!normalizedLength || !Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      await cancelMaintenanceResponseBody(response, 'job_response_invalid_content_length');
      return maintenanceJobResponseFailure('job_response_invalid_content_length');
    }

    if (declaredLength > MAX_JOB_RESPONSE_BYTES) {
      await cancelMaintenanceResponseBody(response, 'job_response_too_large');
      return maintenanceJobResponseFailure('job_response_too_large');
    }
  }

  if (!response.body) {
    return maintenanceJobResponseFailure('job_response_body_missing');
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
        await reader.cancel('job_response_too_large').catch(() => undefined);
        return maintenanceJobResponseFailure('job_response_too_large');
      }

      chunks.push(value);
    }
  } catch {
    await reader.cancel('job_response_read_failed').catch(() => undefined);
    return maintenanceJobResponseFailure('job_response_read_failed');
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return maintenanceJobResponseFailure('job_response_invalid_utf8');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return maintenanceJobResponseFailure('job_response_invalid_json');
  }

  if (!isJsonObject(parsed)) {
    return maintenanceJobResponseFailure('job_response_invalid_json_shape');
  }

  return { body: parsed, failure: null };
}

export function isSuccessfulMaintenanceJobResponse(response: Response, parsedResponse: MaintenanceJobResponseReadResult) {
  return response.ok && parsedResponse.failure === null;
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
      ok: isSuccessfulMaintenanceJobResponse(response, parsedResponse),
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
