import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardSummary, recordDashboardMetricSnapshot } from '@/server/queries/dashboard';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const DEFAULT_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 50;
const MAX_METRIC_SNAPSHOT_ORGANIZATION_LIMIT = 200;

function getMetricSnapshotOrganizationLimit() {
  const configuredLimit = Number(process.env.METRIC_SNAPSHOT_ORGANIZATION_LIMIT);

  if (!Number.isFinite(configuredLimit) || configuredLimit <= 0) {
    return DEFAULT_METRIC_SNAPSHOT_ORGANIZATION_LIMIT;
  }

  return Math.min(Math.trunc(configuredLimit), MAX_METRIC_SNAPSHOT_ORGANIZATION_LIMIT);
}

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const limit = getMetricSnapshotOrganizationLimit();
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id,name')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    reportError(error, { area: 'metric_snapshot_job', step: 'list_organizations' });
    return noStoreJson({ error: 'Unable to list organizations' }, { status: 500 });
  }

  const results = {
    processed: 0,
    failed: 0,
    limit,
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
