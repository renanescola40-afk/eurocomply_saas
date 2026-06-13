import { NextResponse } from 'next/server';

import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getRetentionSummary, RETENTION_POLICIES } from '@/server/governance/retention-policy';
import { createAuditEvent } from '@/server/queries/audit-events';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { requireStepUpForRequest } from '@/server/security/step-up';

export const runtime = 'nodejs';

function jsonDownloadResponse(payload: unknown, filename: string) {
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
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

function getRetentionExportStatus(readinessScore: number) {
  if (readinessScore >= 90) return 'enterprise_ready';
  if (readinessScore >= 70) return 'operational';
  return 'foundation';
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

  try {
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
      stepUp: {
        action: stepUp.assessment.action,
        verifiedAt: stepUp.assessment.verifiedAt,
        expiresAt: stepUp.assessment.expiresAt,
        tokenType: 'signed_hmac',
      },
    };
    const integrity = buildEvidencePackIntegrity(payload);
    const exportPayload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.retention_policy_export',
      payload,
      integrity,
    };

    await createAuditEvent({
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

    const date = new Date().toISOString().slice(0, 10);
    const filename = `eurocomply-retention-policy-${safeFilenamePart(organization.slug ?? organization.name)}-${date}.json`;

    return jsonDownloadResponse(exportPayload, filename);
  } catch (error) {
    reportError(error, {
      area: 'retention_policy_export',
      organizationId: organization.id,
      userId: user.id,
    });

    return NextResponse.json({ error: 'Unable to generate retention policy export.' }, { status: 500 });
  }
}
