import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import {
  classifyAiSystem,
  normalizeAiRiskDomain,
  normalizeAiSystemRole,
  normalizeAiSystemStatus,
} from '@/server/ai-governance/classifier';
import { evaluateAiGovernanceRole } from '@/lib/ai-governance/role-wizard';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAiSystem, listAiSystems } from '@/server/queries/ai-systems';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    return typeof code === 'string' ? code : 'unknown';
  }
  return 'unknown';
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
    permission: 'read_ai_governance',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const systems = await listAiSystems(organization.id);
  return noStoreJson({ systems, role: permission.role });
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

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
    permission: 'manage_ai_governance',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `ai-systems:create:${organization.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitDeniedResponse(rateLimit);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return noStoreJson({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const name = asText(body.name);
  const useCase = asText(body.useCase);

  if (name.length < 2) {
    return noStoreJson({ error: 'Name is required' }, { status: 400 });
  }

  if (useCase.length < 8) {
    return noStoreJson({ error: 'Use case must describe how the AI system is used' }, { status: 400 });
  }

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
    useCase,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
  });

  try {
    const system = await createAiSystem({
      organizationId: organization.id,
      createdBy: user.id,
      name,
      ownerTeam: asText(body.ownerTeam) || null,
      vendorName,
      useCase,
      role,
      lifecycleStatus,
      riskDomain,
      usesPersonalData,
      interactsWithPeople,
      generatesContent,
      biometricIdentification,
      manipulativeOrExploitative,
      riskLevel: classification.riskLevel,
      classificationSummary: classification.summary,
      obligations: classification.obligations,
      nextActions: classification.nextActions,
    });

    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'ai_system_created',
      entityType: 'ai_system',
      entityId: system.id,
      metadata: {
        riskLevel: system.risk_level,
        selectedRole: role,
        recommendedRole: roleAssessment.recommendedRole,
        roleConfidence: roleAssessment.confidence,
        needsLegalReview: roleAssessment.needsLegalReview,
        lifecycleStatus: system.lifecycle_status,
        riskDomain: system.risk_domain,
        actorRole: permission.role,
      },
    });

    return noStoreJson({ system, roleAssessment });
  } catch (error) {
    const code = getErrorCode(error);

    if (code === '42P01' || code === 'PGRST205') {
      return noStoreJson(
        { error: 'ai_systems_table_missing', message: 'Apply the AI governance Supabase migration before creating AI systems.' },
        { status: 503 },
      );
    }

    return noStoreJson({ error: 'Could not create AI system' }, { status: 500 });
  }
}
