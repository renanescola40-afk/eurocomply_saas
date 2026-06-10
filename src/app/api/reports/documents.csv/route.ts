import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { assertCsvExportsEnabled } from '@/server/billing/entitlements';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';

const DOCUMENTS_CSV_HEADER = ['Title', 'Status', 'Version', 'Expires at', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const entitlementCheck = await assertCsvExportsEnabled(organization.id);

  if (!entitlementCheck.ok) {
    return NextResponse.json(
      {
        error: entitlementCheck.error,
        message: entitlementCheck.message,
        plan: entitlementCheck.entitlements.plan,
      },
      { status: entitlementCheck.status },
    );
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `export:documents:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Documents CSV export rate limit exceeded'), { area: 'documents_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return csvDownloadResponse([DOCUMENTS_CSV_HEADER], 'documents-report.csv');
  }

  const { data, error } = await supabase
    .from('documents')
    .select('title,status,version,expires_at,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(new Error('Documents CSV export failed'), { area: 'documents_csv_export', organizationId: organization.id, userId: user.id, code: error.code ?? 'unknown' });
    return NextResponse.json({ error: 'Unable to export documents report' }, { status: 500 });
  }

  const rows = [
    DOCUMENTS_CSV_HEADER,
    ...((data ?? []).map((document) => [
      document.title,
      document.status,
      document.version,
      document.expires_at,
      document.created_at,
      document.updated_at,
    ])),
  ];

  return csvDownloadResponse(rows, 'documents-report.csv');
}
