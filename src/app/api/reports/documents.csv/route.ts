import { csvDownloadResponse } from '@/lib/exports/csv';
import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog } from '@/lib/security/audit-log';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { assertCsvExportsEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const DOCUMENTS_CSV_HEADER = ['Title', 'Status', 'Version', 'Expires at', 'Created at', 'Updated at'];

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrganizationContext>>;

  try {
    context = await requireOrganizationContext();
  } catch (error) {
    return guardErrorResponse(error);
  }

  const { user, organization } = context;
  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'export_data',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const entitlementCheck = await assertCsvExportsEnabled(organization.id);

  if (!entitlementCheck.ok) {
    return upgradeRequiredResponse({
      error: entitlementCheck.error,
      message: entitlementCheck.message,
      plan: entitlementCheck.entitlements.plan,
      requiredPlan: 'professional',
      entitlements: entitlementCheck.entitlements,
    }, entitlementCheck.status);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `export:documents:${organization.id}:${user.id}`,
    policy: 'export',
    userId: user.id,
    organizationId: organization.id,
    action: 'export_documents_csv',
    route: '/api/reports/documents.csv',
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Documents CSV export rate limit exceeded'), { area: 'documents_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    reportError(new Error('Documents CSV export backend unavailable'), {
      area: 'documents_csv_export_configuration',
      organizationId: organization.id,
      userId: user.id,
    });
    return noStoreJson({ error: 'Documents export is temporarily unavailable' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('documents')
    .select('name,status,expires_at,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(new Error('Documents CSV export failed'), { area: 'documents_csv_export', organizationId: organization.id, userId: user.id, code: error.code ?? 'unknown' });
    return noStoreJson({ error: 'Unable to export documents report' }, { status: 500 });
  }

  const rows = [
    DOCUMENTS_CSV_HEADER,
    ...((data ?? []).map((document) => [
      document.name,
      document.status,
      1,
      document.expires_at,
      document.created_at,
      document.updated_at,
    ])),
  ];

  await writeAuditLog({
    action: 'report.export',
    organizationId: organization.id,
    userId: user.id,
    entityType: 'report',
    entityId: 'documents.csv',
    metadata: { format: 'csv', report: 'documents', rows: rows.length },
  });

  return csvDownloadResponse(rows, 'documents-report.csv');
}
