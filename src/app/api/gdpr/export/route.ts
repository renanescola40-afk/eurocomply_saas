import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { collectOrganizationDataExport } from '@/server/privacy/gdpr';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 404 });
  }

  const requestedOrganizationId = new URL(request.url).searchParams.get('organizationId');
  if (requestedOrganizationId && requestedOrganizationId !== organization.id) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'gdpr_export_denied',
      entityType: 'organization',
      entityId: requestedOrganizationId,
      metadata: { reason: 'cross_tenant_export_denied', currentOrganizationId: organization.id },
    });

    return noStoreJson({ error: 'cross_tenant_export_denied' }, { status: 403 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'export_data',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const entitlementCheck = await assertGdprSelfServiceEnabled(organization.id);

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

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const exportBody = await collectOrganizationDataExport({
    organization,
    subject: {
      userId: user.id,
      email: user.email,
    },
  });

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_export_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: {
      scope: 'organization_export',
      plan: entitlementCheck.entitlements.plan,
      role: permission.role,
      tableKeys: Object.keys(exportBody.tables),
      unavailableTables: exportBody.unavailableTables,
      stepUpAction: stepUp.assessment.action,
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      stepUpTokenType: 'signed_hmac',
    },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Exportação GDPR preparada para a organização.',
  });

  const body = {
    ...exportBody,
    stepUp: publicStepUpSummary(stepUp.assessment),
  };

  const fileName = sanitizeDocumentDownloadFileName(
    `eurocomply-gdpr-export-${organization.slug ?? organization.id}.json`,
  );

  return noStoreDownload(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
