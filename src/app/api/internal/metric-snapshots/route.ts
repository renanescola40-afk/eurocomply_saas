import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardSummary, recordDashboardMetricSnapshot } from '@/server/queries/dashboard';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: organizations, error } = await supabase.from('organizations').select('id,name').order('created_at', { ascending: true });

  if (error) {
    reportError(error, { area: 'metric_snapshot_job', step: 'list_organizations' });
    return NextResponse.json({ error: 'Unable to list organizations' }, { status: 500 });
  }

  const results = {
    processed: 0,
    failed: 0,
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

  return NextResponse.json({ ok: results.failed === 0, ...results });
}

export async function GET(request: Request) {
  return POST(request);
}
