import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';

const VENDORS_CSV_HEADER = ['Name', 'Category', 'Risk level', 'Review status', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const rateLimit = await checkDistributedRateLimit({
    key: `export:vendors:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Vendors CSV export rate limit exceeded'), { area: 'vendors_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return csvDownloadResponse([VENDORS_CSV_HEADER], 'vendors-report.csv');
  }

  const { data, error } = await supabase
    .from('vendors')
    .select('name,category,risk_level,review_status,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(new Error('Vendors CSV export failed'), { area: 'vendors_csv_export', organizationId: organization.id, userId: user.id, code: error.code ?? 'unknown' });
    return NextResponse.json({ error: 'Unable to export vendors report' }, { status: 500 });
  }

  const rows = [
    VENDORS_CSV_HEADER,
    ...((data ?? []).map((vendor) => [
      vendor.name,
      vendor.category,
      vendor.risk_level,
      vendor.review_status,
      vendor.created_at,
      vendor.updated_at,
    ])),
  ];

  return csvDownloadResponse(rows, 'vendors-report.csv');
}
