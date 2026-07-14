import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { noStoreJson } from '@/server/security/no-store';

const TASKS_CSV_HEADER = ['Title', 'Category', 'Priority', 'Status', 'Due date', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const rateLimit = await checkDistributedRateLimit({
    key: `export:tasks:${organization.id}:${user.id}`,
    policy: 'export',
    userId: user.id,
    organizationId: organization.id,
    action: 'export_tasks_csv',
    route: '/api/reports/tasks.csv',
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Tasks CSV export rate limit exceeded'), { area: 'tasks_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    reportError(new Error('Tasks CSV export backend unavailable'), {
      area: 'tasks_csv_export_configuration',
      organizationId: organization.id,
      userId: user.id,
    });
    return noStoreJson({ error: 'Tasks export is temporarily unavailable' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('title,category,priority,status,due_date,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(new Error('Tasks CSV export failed'), { area: 'tasks_csv_export', organizationId: organization.id, userId: user.id, code: error.code ?? 'unknown' });
    return noStoreJson({ error: 'Unable to export tasks report' }, { status: 500 });
  }

  const rows = [
    TASKS_CSV_HEADER,
    ...((data ?? []).map((task) => [task.title, task.category, task.priority, task.status, task.due_date, task.created_at, task.updated_at])),
  ];

  await writeAuditLog({
    action: 'report.export',
    organizationId: organization.id,
    userId: user.id,
    entityType: 'report',
    entityId: 'tasks.csv',
    metadata: { format: 'csv', report: 'tasks', rows: rows.length },
  });

  return csvDownloadResponse(rows, 'tasks-report.csv');
}
