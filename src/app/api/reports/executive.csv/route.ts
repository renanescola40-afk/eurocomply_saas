import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getCurrentUser } from '@/server/auth/user';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

function csvEscape(value: string | number) {
  const stringValue = String(value);
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
    key: `export:executive:${organization.id}:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Executive CSV export rate limit exceeded'), { area: 'executive_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  try {
    const summary = await getDashboardSummary(organization.id);
    const rows = [
      ['Metric', 'Value'],
      ['Organization', organization.name],
      ['Compliance score', `${summary.complianceScore}%`],
      ['Open tasks', summary.openTasks],
      ['Total tasks', summary.totals.tasks],
      ['Open risks', summary.openRisks],
      ['Critical risks', summary.criticalRisks],
      ['Total risks', summary.totals.risks],
      ['High-risk vendors', summary.highRiskVendors],
      ['Total vendors', summary.totals.vendors],
      ['Missing documents', summary.missingDocuments],
      ['Total documents', summary.totals.documents],
      ['Generated at', new Date().toISOString()],
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="executive-report.csv"',
      },
    });
  } catch (error) {
    reportError(error, { area: 'executive_csv_export', organizationId: organization.id, userId: user.id });
    return NextResponse.json({ error: 'Unable to export executive report' }, { status: 500 });
  }
}
