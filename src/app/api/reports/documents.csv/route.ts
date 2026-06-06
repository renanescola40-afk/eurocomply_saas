import { NextResponse } from 'next/server';
import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
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

  const supabase = createAdminClient();
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
    ['Name', 'Category', 'Status', 'MIME type', 'Size bytes', 'Expires at', 'Created at', 'Updated at'],
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
