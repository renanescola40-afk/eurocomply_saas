import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/server/auth/user';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

function csvEscape(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

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
    key: `export:vendors:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Vendors CSV export rate limit exceeded'), { area: 'vendors_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('name,category,risk_level,review_status,dpa_status,data_access_level,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(error, { area: 'vendors_csv_export', organizationId: organization.id, userId: user.id });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    ['Name', 'Category', 'Risk level', 'Review status', 'DPA status', 'Data access level', 'Created at', 'Updated at'],
    ...((data ?? []).map((vendor) => [
      vendor.name,
      vendor.category,
      vendor.risk_level,
      vendor.review_status,
      vendor.dpa_status,
      vendor.data_access_level,
      vendor.created_at,
      vendor.updated_at,
    ])),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="vendors-report.csv"',
    },
  });
}
