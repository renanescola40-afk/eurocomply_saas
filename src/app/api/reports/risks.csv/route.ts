import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';

const RISKS_CSV_HEADER = ['Title', 'Status', 'Risk score', 'Likelihood', 'Impact', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const rateLimit = await checkDistributedRateLimit({
    key: `export:risks:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Risks CSV export rate limit exceeded'), { area: 'risks_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return csvDownloadResponse([RISKS_CSV_HEADER], 'risks-report.csv');
  }

  const { data, error } = await supabase
    .from('risks')
    .select('title,status,risk_score,likelihood,impact,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(error, { area: 'risks_csv_export', organizationId: organization.id, userId: user.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    RISKS_CSV_HEADER,
    ...((data ?? []).map((risk) => [risk.title, risk.status, risk.risk_score, risk.likelihood, risk.impact, risk.created_at, risk.updated_at])),
  ];

  return csvDownloadResponse(rows, 'risks-report.csv');
}
