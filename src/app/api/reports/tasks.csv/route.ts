import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';

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
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Tasks CSV export rate limit exceeded'), { area: 'tasks_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return csvDownloadResponse([TASKS_CSV_HEADER], 'tasks-report.csv');
  }

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('title,category,priority,status,due_date,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(error, { area: 'tasks_csv_export', organizationId: organization.id, userId: user.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    TASKS_CSV_HEADER,
    ...((data ?? []).map((task) => [task.title, task.category, task.priority, task.status, task.due_date, task.created_at, task.updated_at])),
  ];

  return csvDownloadResponse(rows, 'tasks-report.csv');
}
