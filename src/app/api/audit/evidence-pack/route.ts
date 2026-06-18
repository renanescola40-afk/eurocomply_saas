import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { createAuditEvent } from '@/server/queries/audit-events';
import { buildAuditEvidencePack } from '@/server/queries/audit-evidence-pack';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

function jsonDownloadResponse(payload: unknown, filename: string) {
  return noStoreDownload(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sanitizeDocumentDownloadFileName(filename)}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function safeFilenamePart(value: string | null | undefined) {
  return String(value ?? 'organization')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'organization';
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

  const stepUp = requireStepUpForRequest({
    request,
    action: 'export_data',
    userId: user.id,
    organizationId: organization.id,
  });

  if (!stepUp.ok) {
    return stepUp.response;
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `export:audit-evidence-pack:${organization.id}:${user.id}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Audit evidence pack export rate limit exceeded'), {
      area: 'audit_evidence_pack_rate_limit',
      organizationId: organization.id,
      userId: user.id,
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const pack = await buildAuditEvidencePack({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      userId: user.id,
      role: permission.role,
      entitlements: planCheck.entitlements,
    });
    const integrity = buildEvidencePackIntegrity(pack);
    const exportPayload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.audit_evidence_pack',
      payload: pack,
      integrity,
      stepUp: publicStepUpSummary(stepUp.assessment),
    };

    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'audit_evidence_pack.exported',
      entityType: 'audit_evidence_pack',
      entityId: organization.id,
      metadata: {
        score: pack.summary.score,
        status: pack.summary.status,
        documents: pack.summary.documents,
        vendors: pack.summary.vendors,
        risks: pack.summary.risks,
        aiSystems: pack.summary.aiSystems,
        aiIncidents: pack.summary.aiIncidents,
        actorRole: permission.role,
        payloadHash: integrity.payloadHash,
        signed: integrity.signed,
        stepUpAction: stepUp.assessment.action,
        stepUpVerifiedAt: stepUp.assessment.verifiedAt,
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `eurocomply-audit-evidence-pack-${safeFilenamePart(organization.slug ?? organization.name)}-${date}.json`;

    return jsonDownloadResponse(exportPayload, filename);
  } catch (error) {
    reportError(error, {
      area: 'audit_evidence_pack_export',
      organizationId: organization.id,
      userId: user.id,
    });

    return noStoreJson({ error: 'audit_evidence_pack_export_failed' }, { status: 500 });
  }
}
