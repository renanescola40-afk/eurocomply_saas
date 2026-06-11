import { NextResponse } from 'next/server';

import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getEnterpriseReadinessSummary } from '@/server/governance/enterprise-readiness';
import { createAuditEvent } from '@/server/queries/audit-events';
import { buildEvidencePackIntegrity } from '@/server/security/evidence-pack-integrity';
import { guardErrorResponse, requireOrganizationContext } from '@/server/security/guards';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

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

  const rateLimit = await checkDistributedRateLimit({
    key: `export:enterprise-readiness:${organization.id}:${user.id}`,
    limit: 8,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    reportError(new Error('Enterprise readiness export rate limit exceeded'), {
      area: 'enterprise_readiness_export_rate_limit',
      organizationId: organization.id,
      userId: user.id,
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const readiness = getEnterpriseReadinessSummary();
    const payload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.enterprise_readiness',
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
      readiness,
    };
    const integrity = buildEvidencePackIntegrity(payload);
    const exportPayload = {
      schemaVersion: '2026-06-10',
      exportType: 'eurocomply.enterprise_readiness_export',
      payload,
      integrity,
    };

    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'enterprise_readiness.exported',
      entityType: 'enterprise_readiness',
      entityId: organization.id,
      metadata: {
        score: readiness.score,
        status: readiness.status,
        weakestAreas: readiness.weakestAreas,
        strongestAreas: readiness.strongestAreas,
        actorRole: permission.role,
        payloadHash: integrity.payloadHash,
        signed: integrity.signed,
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `eurocomply-enterprise-readiness-${safeFilenamePart(organization.slug ?? organization.name)}-${date}.json`;

    return jsonDownloadResponse(exportPayload, filename);
  } catch (error) {
    reportError(error, {
      area: 'enterprise_readiness_export',
      organizationId: organization.id,
      userId: user.id,
    });

    return NextResponse.json({ error: 'Unable to generate enterprise readiness export.' }, { status: 500 });
  }
}
