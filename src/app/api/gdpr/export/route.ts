import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { buildGdprExportAuditMetadata, collectOrganizationDataExport, validateRequestedOrganizationScope } from '@/server/privacy/gdpr';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
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

  const requestContext = buildAuditRequestContextFromRequest(request);

  const rateLimit = await checkDistributedRateLimit({
    policy: 'export',
    userId: user.id,
    organizationId: organization.id,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'gdpr_export',
    route: '/api/gdpr/export',
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const requestedOrganizationScope = validateRequestedOrganizationScope(
    new URL(request.url).searchParams.get('organizationId'),
    organization.id,
  );

  if (!requestedOrganizationScope.ok) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'gdpr_export_denied',
      entityType: 'organization',
      entityId: requestedOrganizationScope.requestedOrganizationId ?? organization.id,
      metadata: {
        reason: requestedOrganizationScope.auditReason,
        currentOrganizationId: organization.id,
        requestedOrganizationId: requestedOrganizationScope.requestedOrganizationId,
      },
      requestContext,
    });

    return noStoreJson({ error: requestedOrganizationScope.error }, { status: requestedOrganizationScope.status });
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
    organization: {
      id: organization.id,
      name: organization.name ?? null,
      slug: organization.slug ?? null,
    },
    subject: {
      userId: user.id,
      email: user.email,
    },
  });

  if (exportBody.unavailableTables.length > 0) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'gdpr_export_failed',
      entityType: 'organization',
      entityId: organization.id,
      metadata: buildGdprExportAuditMetadata({
        plan: entitlementCheck.entitlements.plan,
        role: permission.role,
        tableKeys: Object.keys(exportBody.tables),
        unavailableTables: exportBody.unavailableTables,
        stepUp: stepUp.assessment,
      }),
      requestContext,
    });

    return noStoreJson({ error: 'gdpr_export_incomplete' }, { status: 503 });
  }

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_export_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: buildGdprExportAuditMetadata({
      plan: entitlementCheck.entitlements.plan,
      role: permission.role,
      tableKeys: Object.keys(exportBody.tables),
      unavailableTables: exportBody.unavailableTables,
      stepUp: stepUp.assessment,
    }),
    requestContext,
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
