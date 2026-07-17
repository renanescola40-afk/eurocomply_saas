import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getDashboardSummary } from '@/server/queries/dashboard';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { noStoreJson } from '@/server/security/no-store';

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const rateLimit = await checkDistributedRateLimit({
    key: `export:executive:${organization.id}:${user.id}`,
    policy: 'export',
    userId: user.id,
    organizationId: organization.id,
    action: 'export_executive_csv',
    route: '/api/reports/executive.csv',
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
    const exportedRowCount = rows.length - 1;

    const auditResult = await writeAuditLog({
      action: 'report.export',
      organizationId: organization.id,
      userId: user.id,
      entityType: 'report',
      entityId: 'executive.csv',
      metadata: { format: 'csv', report: 'executive', rows: exportedRowCount },
    });

    if (!auditResult.persisted) {
      reportError(new Error('Executive CSV export audit persistence failed'), {
        area: 'executive_csv_export_audit',
        organizationId: organization.id,
        userId: user.id,
      });
      return noStoreJson({ error: 'Executive export is temporarily unavailable' }, { status: 503 });
    }

    return csvDownloadResponse(rows, 'executive-report.csv');
  } catch (error) {
    reportError(error, { area: 'executive_csv_export', organizationId: organization.id, userId: user.id });
    return noStoreJson({ error: 'Unable to export executive report' }, { status: 500 });
  }
}
