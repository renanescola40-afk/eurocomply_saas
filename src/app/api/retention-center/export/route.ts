import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getRetentionSummary, RETENTION_POLICIES } from '@/server/governance/retention-policy';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, secureApiError } from '@/server/security/api-guards';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';
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

function getRetentionExportStatus(readinessScore: number) {
  if (readinessScore >= 90) return 'enterprise_ready';
  if (readinessScore >= 70) return 'operational';
  return 'foundation';
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'export_data',
    });

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
      key: `export:retention-policy:${organization.id}:${user.id}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      reportError(new Error('Retention policy export rate limit exceeded'), {
        area: 'retention_policy_export_rate_limit',
        organizationId: organization.id,
        userId: user.id,
      });
      return rateLimitResponse(rateLimit);
    }

    const summary = getRetentionSummary();
    const status = getRetentionExportStatus(summary.readinessScore);
    const payload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.retention_policy',
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
      summary: {
        ...summary,
        status,
      },
      policies: RETENTION_POLICIES,
      stepUp: publicStepUpSummary(stepUp.assessment),
    };
    const integrity = buildEvidencePackIntegrity(payload);
    const exportPayload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.retention_policy_export',
      payload,
      integrity,
    };

    const auditResult = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'retention_policy.exported',
      entityType: 'retention_policy',
      entityId: organization.id,
      metadata: {
        score: summary.readinessScore,
        status,
        totalPolicies: summary.totalPolicies,
        enterpriseReadyPolicies: summary.enterpriseReadyPolicies,
        actorRole: permission.role,
        payloadHash: integrity.payloadHash,
        signed: integrity.signed,
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      },
    });

    if (!auditResult.persisted) {
      console.error('[retention-center] export_audit_unavailable');
      return noStoreJson({ error: 'retention_policy_export_audit_unavailable' }, { status: 503 });
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = sanitizeDocumentDownloadFileName(
      `eurocomply-retention-policy-${organization.slug ?? organization.name ?? organization.id}-${date}.json`,
    );

    return jsonDownloadResponse(exportPayload, filename);
  } catch (error) {
    reportError(error, {
      area: 'retention_policy_export',
      error: error instanceof Error ? error.name : 'unknown',
    });

    return secureApiError(error);
  }
}
