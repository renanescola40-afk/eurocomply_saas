import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import {
  classifyAiSystem,
  normalizeAiRiskDomain,
  normalizeAiSystemRole,
  normalizeAiSystemStatus,
} from '@/server/ai-governance/classifier';
import { evaluateAiGovernanceRole } from '@/lib/ai-governance/role-wizard';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAiSystem, listAiSystems } from '@/server/queries/ai-systems';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

const AI_SYSTEM_JSON_MAX_BYTES = 64 * 1024;

export const aiSystemBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  useCase: z.string().trim().min(8).max(4000),
  ownerTeam: z.string().trim().max(160).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  countryMarket: z.string().trim().max(120).nullable().optional(),
  processedData: z.string().trim().max(2000).nullable().optional(),
  vendorName: z.string().trim().max(160).nullable().optional(),
  modelName: z.string().trim().max(160).nullable().optional(),
  role: z.unknown().optional(),
  lifecycleStatus: z.unknown().optional(),
  riskDomain: z.unknown().optional(),
  usesPersonalData: z.unknown().optional(),
  interactsWithPeople: z.unknown().optional(),
  generatesContent: z.unknown().optional(),
  biometricIdentification: z.unknown().optional(),
  manipulativeOrExploitative: z.unknown().optional(),
});

export type ParsedAiSystemBody = z.infer<typeof aiSystemBodySchema>;

export function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

export function classifyParsedAiSystemBody(body: ParsedAiSystemBody) {
  const role = normalizeAiSystemRole(body.role);
  const lifecycleStatus = normalizeAiSystemStatus(body.lifecycleStatus);
  const riskDomain = normalizeAiRiskDomain(body.riskDomain);
  const usesPersonalData = asBoolean(body.usesPersonalData);
  const interactsWithPeople = asBoolean(body.interactsWithPeople);
  const generatesContent = asBoolean(body.generatesContent);
  const biometricIdentification = asBoolean(body.biometricIdentification);
  const manipulativeOrExploitative = asBoolean(body.manipulativeOrExploitative);
  const vendorName = asText(body.vendorName) || null;

  const classification = classifyAiSystem({
    role,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
  });

  const roleAssessment = evaluateAiGovernanceRole({
    role,
    vendorName,
    useCase: body.useCase,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
  });

  return {
    role,
    lifecycleStatus,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
    vendorName,
    classification,
    roleAssessment,
  };
}

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

export async function GET() {
  try {
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

    const systems = await listAiSystems(organization.id);
    return noStoreJson({ systems, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

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
      key: `ai-systems:create:${organization.id}:${user.id}`,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return rateLimitDeniedResponse(rateLimit);
    }

    const body = await parseJsonBodyWithZod(request, {
      schema: aiSystemBodySchema,
      maxBytes: AI_SYSTEM_JSON_MAX_BYTES,
    });
    const result = classifyParsedAiSystemBody(body);

    const system = await createAiSystem({
      organizationId: organization.id,
      createdBy: user.id,
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
      action: 'ai_system_created',
      entityType: 'ai_system',
      entityId: system.id,
      metadata: {
        riskLevel: system.risk_level,
        selectedRole: result.role,
        recommendedRole: result.roleAssessment.recommendedRole,
        roleConfidence: result.roleAssessment.confidence,
        needsLegalReview: result.roleAssessment.needsLegalReview,
        lifecycleStatus: system.lifecycle_status,
        riskDomain: system.risk_domain,
        actorRole: permission.role,
      },
    });

    return noStoreJson({ system, roleAssessment: result.roleAssessment });
  } catch (error) {
    return secureApiError(error);
  }
}
