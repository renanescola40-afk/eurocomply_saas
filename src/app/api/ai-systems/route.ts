import { NextResponse } from 'next/server';
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

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
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
  return NextResponse.json({ systems, role: permission.role });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_ai_governance',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const name = asText(body.name);
  const useCase = asText(body.useCase);

  if (name.length < 2) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (useCase.length < 8) {
    return NextResponse.json({ error: 'Use case must describe how the AI system is used' }, { status: 400 });
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

    return NextResponse.json({ system, roleAssessment });
  } catch (error) {
    const code = getErrorCode(error);

    if (code === '42P01' || code === 'PGRST205') {
      return NextResponse.json(
        { error: 'ai_systems_table_missing', message: 'Apply the AI governance Supabase migration before creating AI systems.' },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: 'Could not create AI system' }, { status: 500 });
  }
}
