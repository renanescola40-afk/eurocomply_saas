import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getContinuitySummary, CONTINUITY_CONTROLS } from '@/server/governance/continuity-policy';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { checkDistributedRateLimit } from '@/server/security/rate-limit';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'export_data',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const plan = await assertPlanAtLeast(organization.id, 'business');

  if (!plan.ok) {
    return upgradeRequiredResponse({
      error: plan.error,
      message: plan.message,
      plan: plan.entitlements.plan,
      requiredPlan: 'business',
      entitlements: plan.entitlements,
    }, plan.status);
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
    category: 'export',
    key: `continuity-export:${organization.id}:${user.id}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const summary = getContinuitySummary();
  const payload = {
    schemaVersion: '2026-06-12.continuity-export.v1',
    exportType: 'continuity_center',
    generatedAt: new Date().toISOString(),
    generatedBy: {
      userId: user.id,
      email: user.email,
      role: permission.role,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    plan: plan.entitlements.plan,
    summary,
    controls: CONTINUITY_CONTROLS,
    assurance: {
      readinessLevel: summary.level,
      readinessScore: summary.readinessScore,
      openCriticalControls: summary.openCriticalControls,
      nextActions: summary.nextActions,
    },
    stepUp: publicStepUpSummary(stepUp.assessment),
  };

  const integrity = buildEvidencePackIntegrity(payload);
  const envelope = {
    schemaVersion: payload.schemaVersion,
    exportType: payload.exportType,
    payload,
    integrity,
  };

  const auditResult = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'continuity_center_exported',
    entityType: 'organization',
    entityId: organization.id,
    metadata: {
      readinessScore: summary.readinessScore,
      readinessLevel: summary.level,
      openCriticalControls: summary.openCriticalControls,
      actorRole: permission.role,
      plan: plan.entitlements.plan,
      payloadHash: integrity.payloadHash,
      stepUpAction: stepUp.assessment.action,
      stepUpVerifiedAt: stepUp.assessment.verifiedAt,
    },
  });

  if (!auditResult.persisted) {
    console.error('[continuity-center] export_audit_unavailable');
    return noStoreJson({ error: 'continuity_center_export_audit_unavailable' }, { status: 503 });
  }

  const fileName = sanitizeDocumentDownloadFileName(`eurocomply-continuity-center-${organization.slug ?? organization.id}.json`);

  return noStoreDownload(JSON.stringify(envelope, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-EuroComply-Payload-Hash': integrity.payloadHash,
    },
  });
}
