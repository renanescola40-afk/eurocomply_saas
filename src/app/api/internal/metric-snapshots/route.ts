import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { createAdminClient } from '@/lib/supabase/admin';
import { internalBatchResponse } from '@/server/jobs/internal-batch-response';
import { getDashboardSummary, recordDashboardMetricSnapshot } from '@/server/queries/dashboard';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const DEFAULT_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 50;
const MAX_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 200;
const METRIC_SNAPSHOT_ORGANIZATION_TIMEOUT_MS = 5_000;
const ONE_DAY_MS = 86_400_000;

class MetricSnapshotOrganizationTimeoutError extends Error {
  constructor() {
    super('Metric snapshot organization work timed out');
    this.name = 'MetricSnapshotOrganizationTimeoutError';
  }
}

type OrganizationBatchRow = {
  id: string;
  name?: string | null;
};

function getMetricSnapshotOrganizationLimit() {
  const configuredLimit = Number(process.env.METRIC_SNAPSHOT_ORGANIZATION_LIMIT);

  if (!Number.isFinite(configuredLimit) || configuredLimit <= 0) {
    return DEFAULT_METRIC_SNAPSHOT_ORGANIZATION_LIMIT;
  }

  return Math.min(Math.trunc(configuredLimit), MAX_METRIC_SNAPSHOT_ORGANIZATION_LIMIT);
}

function getRotatingBatchStart(totalOrganizations: number, limit: number) {
  if (totalOrganizations <= limit) return 0;

  const batchCount = Math.ceil(totalOrganizations / limit);
  const daySeed = Math.floor(Date.now() / ONE_DAY_MS);

  return (daySeed % batchCount) * limit;
}

async function withMetricSnapshotOrganizationTimeout<T>(operation: Promise<T>) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new MetricSnapshotOrganizationTimeoutError()),
      METRIC_SNAPSHOT_ORGANIZATION_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function listOrganizationBatch(supabase: ReturnType<typeof createAdminClient>, limit: number) {
  const countResult = await supabase.from('organizations').select('id', { count: 'exact', head: true });

  if (countResult.error) {
    return { organizations: null, total: 0, start: 0, error: countResult.error };
  }

  const total = countResult.count ?? 0;
  const start = getRotatingBatchStart(total, limit);
  const end = Math.min(start + limit - 1, Math.max(total - 1, 0));

  if (total === 0) {
    return { organizations: [] as OrganizationBatchRow[], total, start, error: null };
  }

  const batchResult = await supabase
    .from('organizations')
    .select('id,name')
    .order('created_at', { ascending: true })
    .range(start, end);

  if (batchResult.error) {
    return { organizations: null, total, start, error: batchResult.error };
  }

  return { organizations: (batchResult.data ?? []) as OrganizationBatchRow[], total, start, error: null };
}

async function createMetricSnapshotForOrganization(organizationId: string) {
  const summary = await getDashboardSummary(organizationId);
  await recordDashboardMetricSnapshot(organizationId, summary);
}

export async function POST(request: Request) {
  const authRateLimit = await checkDistributedRateLimit({
    policy: 'auth',
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'metric_snapshot_auth',
    route: '/api/internal/metric-snapshots',
  });

  if (!authRateLimit.allowed) {
    return rateLimitResponse(authRateLimit);
  }

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const limit = getMetricSnapshotOrganizationLimit();
  const { organizations, total, start, error } = await listOrganizationBatch(supabase, limit);

  if (error) {
    reportError(error, { area: 'metric_snapshot_job', step: 'list_organizations' });
    return noStoreJson({ error: 'Unable to list organizations' }, { status: 500 });
  }

  const results = {
    processed: 0,
    failed: 0,
    limit,
    totalOrganizations: total,
    batchStart: start,
    failures: [] as Array<{ organizationId: string; message: 'internal_error' | 'timeout' }>,
  };

  for (const organization of organizations ?? []) {
    try {
      await withMetricSnapshotOrganizationTimeout(createMetricSnapshotForOrganization(organization.id));
      results.processed += 1;
    } catch (snapshotError) {
      results.failed += 1;
      const timedOut = snapshotError instanceof MetricSnapshotOrganizationTimeoutError;
      results.failures.push({
        organizationId: organization.id,
        message: timedOut ? 'timeout' : 'internal_error',
      });
      reportError(snapshotError, {
        area: 'metric_snapshot_job',
        organizationId: organization.id,
        timedOut,
      });
    }
  }

  return internalBatchResponse({
    failureCount: results.failed,
    failureMessage: 'Unable to create all metric snapshots',
    summary: results,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
