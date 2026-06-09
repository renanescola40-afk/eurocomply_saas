import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';

const DOCUMENTS_CSV_HEADER = ['Name', 'Category', 'Status', 'MIME type', 'Size bytes', 'Expires at', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
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
    .select('name,category,status,mime_type,size_bytes,expires_at,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(error, { area: 'documents_csv_export', organizationId: organization.id, userId: user.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    DOCUMENTS_CSV_HEADER,
    ...((data ?? []).map((document) => [
      document.name,
      document.category,
      document.status,
      document.mime_type,
      document.size_bytes,
      document.expires_at,
      document.created_at,
      document.updated_at,
    ])),
  ];

  return csvDownloadResponse(rows, 'documents-report.csv');
}
