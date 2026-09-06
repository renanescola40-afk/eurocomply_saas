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
import { requireStepUpForRequest } from '@/server/security/step-up';

const VENDORS_CSV_HEADER = ['Name', 'Category', 'Risk level', 'Review status', 'Created at', 'Updated at'];

export async function GET(request: Request) {
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
    minimumPlan: 'professional',
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

  const stepUp = await requireStepUpForRequest({
    request,
    action: 'export_data',
    userId: user.id,
    organizationId: organization.id,
  });
  if (!stepUp.ok) return stepUp.response;

  const rateLimit = await checkDistributedRateLimit({
    key: `export:vendors:${organization.id}:${user.id}`,
    policy: 'export',
    userId: user.id,
    organizationId: organization.id,
    action: 'export_vendors_csv',
    route: '/api/reports/vendors.csv',
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Vendors CSV export rate limit exceeded'), { area: 'vendors_csv_export_rate_limit', organizationId: organization.id, userId: user.id });
    return rateLimitResponse(rateLimit);
  }

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    reportError(new Error('Vendors CSV export backend unavailable'), { area: 'vendors_csv_export_configuration', organizationId: organization.id, userId: user.id });
    return noStoreJson({ error: 'Unable to export vendors report' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('vendors')
    .select('name,category,risk_level,review_status,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(new Error('Vendors CSV export failed'), { area: 'vendors_csv_export', organizationId: organization.id, userId: user.id, code: error.code ?? 'unknown' });
    return noStoreJson({ error: 'Unable to export vendors report' }, { status: 500 });
  }

  const exportedRowCount = data?.length ?? 0;
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

  const auditResult = await writeAuditLog({
    action: 'report.export',
    organizationId: organization.id,
    userId: user.id,
    entityType: 'report',
    entityId: 'vendors.csv',
    metadata: {
      format: 'csv', report: 'vendors', rows: exportedRowCount,
      stepUpAction: stepUp.assessment.action,
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      stepUpTokenType: 'signed_hmac',
    },
  });

  if (!auditResult.persisted) {
    reportError(new Error('Vendors CSV export audit persistence failed'), {
      area: 'vendors_csv_export_audit',
      organizationId: organization.id,
      userId: user.id,
    });
    return noStoreJson({ error: 'Vendors export is temporarily unavailable' }, { status: 503 });
  }

  return csvDownloadResponse(rows, 'vendors-report.csv');
}
