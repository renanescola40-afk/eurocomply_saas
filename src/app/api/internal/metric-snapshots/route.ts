import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardSummary, recordDashboardMetricSnapshot } from '@/server/queries/dashboard';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const DEFAULT_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 50;
const MAX_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 200;
const ONE_DAY_MS = 86_400_000;

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

export async function POST(request: Request) {
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
    failures: [] as Array<{ organizationId: string; message: string }>,
  };

  for (const organization of organizations ?? []) {
    try {
      const summary = await getDashboardSummary(organization.id);
      await recordDashboardMetricSnapshot(organization.id, summary);
      results.processed += 1;
    } catch (snapshotError) {
      results.failed += 1;
      const message = snapshotError instanceof Error ? snapshotError.message : 'Unknown snapshot error';
      results.failures.push({ organizationId: organization.id, message });
      reportError(snapshotError, { area: 'metric_snapshot_job', organizationId: organization.id });
    }
  }

  return noStoreJson({ ok: results.failed === 0, ...results });
}

export async function GET(request: Request) {
  return POST(request);
}
