import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';

export const runtime = 'nodejs';

const MAINTENANCE_JOBS = [
  '/api/internal/metric-snapshots',
  '/api/internal/compliance-alerts',
  '/api/internal/trial-reminders',
  '/api/intelligence/refresh',
] as const;

function getBaseUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, '');
}

function getInternalCronCredential() {
  return process.env.CRON_SECRET ?? process.env.INTERNAL_CRON_SECRET ?? '';
}

async function runMaintenanceJob(baseUrl: string, path: string, credential: string) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${credential}`,
      'x-internal-cron-secret': credential,
    },
    cache: 'no-store',
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
}

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credential = getInternalCronCredential();
  if (!credential) {
    return NextResponse.json({ error: 'Internal cron credential is not configured.' }, { status: 500 });
  }

  const baseUrl = getBaseUrl(request);
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

  return NextResponse.json({
    ok: failed.length === 0,
    jobs: results.length,
    failed: failed.length,
    results,
  }, { status: failed.length === 0 ? 200 : 207 });
}

export async function GET(request: Request) {
  return POST(request);
}
