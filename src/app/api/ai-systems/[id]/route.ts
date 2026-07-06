import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getAiSystem, listAiSystemHistory, updateAiSystem } from '@/server/queries/ai-systems';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { aiSystemBodySchema, asText, classifyParsedAiSystemBody } from '../route';

const AI_SYSTEM_JSON_MAX_BYTES = 64 * 1024;

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

type AiSystemRouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: AiSystemRouteParams) {
  try {
    const { id } = await params;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
    });

    if (!permission.ok) {
      return permissionDeniedResponse(permission);
    }

    const [system, history] = await Promise.all([
      getAiSystem(id, organization.id),
      listAiSystemHistory(id, organization.id),
    ]);

    if (!system) {
      return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
    }

    return noStoreJson({ system, history, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function PATCH(request: Request, { params }: AiSystemRouteParams) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const { id } = await params;
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_governance',
    });

    if (!permission.ok) {
      return permissionDeniedResponse(permission);
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `ai-systems:update:${organization.id}:${user.id}`,
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return rateLimitDeniedResponse(rateLimit);
    }

    const existing = await getAiSystem(id, organization.id);
    if (!existing) {
      return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
    }

    const body = await parseJsonBodyWithZod(request, {
      schema: aiSystemBodySchema,
      maxBytes: AI_SYSTEM_JSON_MAX_BYTES,
    });
    const result = classifyParsedAiSystemBody(body);

    const system = await updateAiSystem(id, organization.id, {
      reassessedBy: user.id,
      name: body.name,
      ownerTeam: asText(body.ownerTeam) || null,
      category: asText(body.category) || null,
      countryMarket: asText(body.countryMarket) || null,
      processedData: asText(body.processedData) || null,
      vendorName: result.vendorName,
      modelName: asText(body.modelName) || null,
      useCase: body.useCase,
      role: result.role,
      lifecycleStatus: result.lifecycleStatus,
      riskDomain: result.riskDomain,
      usesPersonalData: result.usesPersonalData,
      interactsWithPeople: result.interactsWithPeople,
      generatesContent: result.generatesContent,
      biometricIdentification: result.biometricIdentification,
      manipulativeOrExploitative: result.manipulativeOrExploitative,
      riskLevel: result.classification.riskLevel,
      classificationSummary: result.classification.summary,
      obligations: result.classification.obligations,
      nextActions: result.classification.nextActions,
    });

    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'ai_system_reassessed',
      entityType: 'ai_system',
      entityId: system.id,
      metadata: {
        previousRiskLevel: existing.risk_level,
        riskLevel: system.risk_level,
        previousLifecycleStatus: existing.lifecycle_status,
        lifecycleStatus: system.lifecycle_status,
        actorRole: permission.role,
      },
    });

    const history = await listAiSystemHistory(system.id, organization.id);

    return noStoreJson({ system, history, roleAssessment: result.roleAssessment });
  } catch (error) {
    return secureApiError(error);
  }
}
