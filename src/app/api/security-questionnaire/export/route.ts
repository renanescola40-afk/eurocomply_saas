import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getSecurityQuestionnaireSummary, SECURITY_QUESTIONNAIRE_ITEMS } from '@/server/governance/security-questionnaire';
import { createAuditEvent } from '@/server/queries/audit-events';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

function jsonDownloadResponse(payload: unknown, filename: string) {
  return noStoreDownload(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

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
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const planCheck = await assertPlanAtLeast(organization.id, 'business');

  if (!planCheck.ok) {
    return upgradeRequiredResponse({
      error: planCheck.error,
      message: planCheck.message,
      plan: planCheck.entitlements.plan,
      requiredPlan: 'business',
      entitlements: planCheck.entitlements,
    }, planCheck.status);
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

  const rateLimit = await checkDistributedRateLimit({
    key: `export:security-questionnaire:${organization.id}:${user.id}`,
    limit: 8,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Security questionnaire export rate limit exceeded'), {
      area: 'security_questionnaire_export_rate_limit',
      organizationId: organization.id,
      userId: user.id,
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const payload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.security_questionnaire',
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: user.id,
        role: permission.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      plan: planCheck.entitlements,
      summary: getSecurityQuestionnaireSummary(),
      items: SECURITY_QUESTIONNAIRE_ITEMS,
      stepUp: publicStepUpSummary(stepUp.assessment),
    };
    const integrity = buildEvidencePackIntegrity(payload);
    const exportPayload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.security_questionnaire_export',
      payload,
      integrity,
    };

    const auditResult = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'security_questionnaire.exported',
      entityType: 'security_questionnaire',
      entityId: organization.id,
      metadata: {
        score: payload.summary.score,
        status: payload.summary.status,
        totalItems: payload.summary.totalItems,
        readyItems: payload.summary.readyItems,
        actorRole: permission.role,
        payloadHash: integrity.payloadHash,
        signed: integrity.signed,
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      },
    });

    if (!auditResult.persisted) {
      reportError(new Error('Security questionnaire export audit persistence unavailable'), {
        area: 'security_questionnaire_export_audit',
        organizationId: organization.id,
        userId: user.id,
      });
      return noStoreJson({ error: 'security_questionnaire_export_audit_unavailable' }, { status: 503 });
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = sanitizeDocumentDownloadFileName(
      `eurocomply-security-questionnaire-${organization.slug ?? organization.name ?? organization.id}-${date}.json`,
    );

    return jsonDownloadResponse(exportPayload, filename);
  } catch (error) {
    reportError(error, {
      area: 'security_questionnaire_export',
      organizationId: organization.id,
      userId: user.id,
    });

    return noStoreJson({ error: 'security_questionnaire_export_failed' }, { status: 500 });
  }
}
