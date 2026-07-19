import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiSystemBodySchema, asText, classifyParsedAiSystemBody } from '@/server/ai-governance/system-payload';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAiSystem, listAiSystems } from '@/server/queries/ai-systems';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

const AI_SYSTEM_JSON_MAX_BYTES = 64 * 1024;
const ENTERPRISE_VENDOR_COLUMNS = 'id,organization_id,ai_system_id,vendor_name,status,risk_level,checklist,next_review_at,notes,created_by,created_at,updated_at';
const ENTERPRISE_RISK_REVIEW_COLUMNS = 'id,organization_id,ai_system_id,risk_level,status,decision,due_at,notes,requested_by,created_at,updated_at';

const nullableUuidSchema = z.preprocess((value) => (value === '' ? null : value), z.string().uuid().nullable().optional());

const evidencePackBodySchema = z.object({
  title: z.string().trim().min(3).max(140),
  countryScope: z.array(z.string().trim().min(1).max(56)).max(12).optional(),
  readinessScoreSnapshot: z.number().int().min(0).max(100).optional(),
});

const vendorDiligenceBodySchema = z.object({
  vendorName: z.string().trim().min(2).max(140),
  aiSystemId: nullableUuidSchema,
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  nextReviewAt: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const riskReviewBodySchema = z.object({
  aiSystemId: nullableUuidSchema,
  riskLevel: z.string().trim().min(2).max(80),
  dueAt: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

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

function getDefaultVendorChecklist() {
  return [
    { id: 'legal_entity', label: 'Legal entity, DPA and processing role verified', status: 'todo' },
    { id: 'model_facts', label: 'Model/provider facts and hosting region documented', status: 'todo' },
    { id: 'security_review', label: 'Security, retention and incident response reviewed', status: 'todo' },
    { id: 'ai_act_review', label: 'AI Act role, transparency duties and risk exposure assessed', status: 'todo' },
    { id: 'procurement_controls', label: 'Procurement controls, audit rights and exit plan captured', status: 'todo' },
  ];
}

function normalizeCountryScope(countryScope?: string[]) {
  const normalized = (countryScope ?? [])
    .map((country) => country.trim())
    .filter((country) => country.length > 0)
    .slice(0, 12);

  return normalized.length > 0 ? normalized : ['EU'];
}

async function resolveOrganizationAiSystemId(organizationId: string, aiSystemId?: string | null) {
  if (!aiSystemId) return null;
  const systems = await listAiSystems(organizationId);
  return systems.some((system) => system.id === aiSystemId) ? aiSystemId : null;
}

async function createEvidencePackWorkflow(input: {
  organizationId: string;
  actorUserId: string;
  title: string;
  countryScope?: string[];
  readinessScoreSnapshot?: number;
}) {
  const supabase = createAdminClient();
  const systems = await listAiSystems(input.organizationId);
  const countryScope = normalizeCountryScope(
    input.countryScope?.length
      ? input.countryScope
      : systems.map((system) => system.country_market ?? 'EU'),
  );

  const { data, error } = await supabase.rpc('create_enterprise_evidence_pack_atomic', {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_title: input.title,
    p_country_scope: countryScope,
    p_readiness_score_snapshot: input.readinessScoreSnapshot ?? null,
  });

  if (error) {
    console.warn('[enterprise-readiness] evidence_pack_create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  const result = data as { pack?: { id?: string }; items?: unknown[] } | null;
  if (!result?.pack?.id || !Array.isArray(result.items)) {
    throw new Error('enterprise_evidence_pack_invalid_result');
  }

  return result as { pack: { id: string }; items: unknown[] };
}

async function createVendorDiligenceWorkflow(input: {
  organizationId: string;
  actorUserId: string;
  vendorName: string;
  aiSystemId?: string | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextReviewAt?: string | null;
  notes?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('enterprise_vendor_due_diligence')
    .insert({
      organization_id: input.organizationId,
      ai_system_id: input.aiSystemId ?? null,
      vendor_name: input.vendorName,
      status: 'in_progress',
      risk_level: input.riskLevel,
      checklist: getDefaultVendorChecklist(),
      next_review_at: input.nextReviewAt || null,
      notes: input.notes || null,
      created_by: input.actorUserId,
      reviewer_user_id: input.actorUserId,
    })
    .select(ENTERPRISE_VENDOR_COLUMNS)
    .single();

  if (error) {
    console.warn('[enterprise-readiness] vendor_diligence_create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return data;
}

async function createRiskReviewWorkflow(input: {
  organizationId: string;
  actorUserId: string;
  aiSystemId?: string | null;
  riskLevel: string;
  dueAt?: string | null;
  notes?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('enterprise_risk_reviews')
    .insert({
      organization_id: input.organizationId,
      ai_system_id: input.aiSystemId ?? null,
      risk_level: input.riskLevel,
      status: 'in_review',
      due_at: input.dueAt || null,
      notes: input.notes || null,
      requested_by: input.actorUserId,
      reviewer_user_id: input.actorUserId,
    })
    .select(ENTERPRISE_RISK_REVIEW_COLUMNS)
    .single();

  if (error) {
    console.warn('[enterprise-readiness] risk_review_create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return data;
}

function getWorkflowPermission(workflow: string) {
  if (workflow === 'vendor_due_diligence') return 'manage_vendors';
  if (workflow === 'risk_review') return 'manage_risks';
  return 'manage_ai_governance';
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

    const workflow = new URL(request.url).searchParams.get('workflow') ?? 'ai_system';
    if (!['ai_system', 'evidence_pack', 'vendor_due_diligence', 'risk_review'].includes(workflow)) {
      return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: getWorkflowPermission(workflow),
    });

    if (!permission.ok) {
      return permissionDeniedResponse(permission);
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `ai-systems:${workflow}:${organization.id}:${user.id}`,
      limit: workflow === 'ai_system' ? 20 : 12,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return rateLimitDeniedResponse(rateLimit);
    }

    if (workflow === 'evidence_pack') {
      const body = await parseJsonBodyWithZod(request, { schema: evidencePackBodySchema, maxBytes: AI_SYSTEM_JSON_MAX_BYTES });
      const result = await createEvidencePackWorkflow({
        organizationId: organization.id,
        actorUserId: user.id,
        title: body.title,
        countryScope: body.countryScope,
        readinessScoreSnapshot: body.readinessScoreSnapshot,
      });
      await createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'enterprise_evidence_pack_created',
        entityType: 'enterprise_evidence_pack',
        entityId: result.pack.id,
        metadata: { itemCount: result.items.length, actorRole: permission.role },
      });
      return noStoreJson(result, { status: 201 });
    }

    if (workflow === 'vendor_due_diligence') {
      const body = await parseJsonBodyWithZod(request, { schema: vendorDiligenceBodySchema, maxBytes: AI_SYSTEM_JSON_MAX_BYTES });
      const aiSystemId = await resolveOrganizationAiSystemId(organization.id, body.aiSystemId);
      if (body.aiSystemId && !aiSystemId) {
        return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      }
      const vendorReview = await createVendorDiligenceWorkflow({
        organizationId: organization.id,
        actorUserId: user.id,
        vendorName: body.vendorName,
        aiSystemId,
        riskLevel: body.riskLevel,
        nextReviewAt: body.nextReviewAt,
        notes: body.notes,
      });
      const audit = await createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'vendor_due_diligence_started',
        entityType: 'enterprise_vendor_due_diligence',
        entityId: vendorReview.id,
        metadata: { riskLevel: vendorReview.risk_level, actorRole: permission.role },
      });

      if (!audit.persisted) {
        const { error: rollbackError } = await createAdminClient()
          .from('enterprise_vendor_due_diligence')
          .delete()
          .eq('id', vendorReview.id)
          .eq('organization_id', organization.id)
          .eq('created_by', user.id)
          .eq('created_at', vendorReview.created_at);

        if (rollbackError) {
          console.warn('[enterprise-readiness] vendor_diligence_audit_compensation_failed', {
            code: rollbackError.code ?? 'unknown',
          });
        }

        return noStoreJson({ error: 'vendor_diligence_audit_unavailable' }, { status: 503 });
      }

      return noStoreJson({ vendorReview }, { status: 201 });
    }

    if (workflow === 'risk_review') {
      const body = await parseJsonBodyWithZod(request, { schema: riskReviewBodySchema, maxBytes: AI_SYSTEM_JSON_MAX_BYTES });
      const aiSystemId = await resolveOrganizationAiSystemId(organization.id, body.aiSystemId);
      if (body.aiSystemId && !aiSystemId) {
        return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      }
      const riskReview = await createRiskReviewWorkflow({
        organizationId: organization.id,
        actorUserId: user.id,
        aiSystemId,
        riskLevel: body.riskLevel,
        dueAt: body.dueAt,
        notes: body.notes,
      });
      await createAuditEvent({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'risk_review_started',
        entityType: 'enterprise_risk_review',
        entityId: riskReview.id,
        metadata: { riskLevel: riskReview.risk_level, actorRole: permission.role },
      });
      return noStoreJson({ riskReview }, { status: 201 });
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

    const audit = await createAuditEvent({
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

    if (!audit.persisted) {
      const { error: rollbackError } = await createAdminClient()
        .from('ai_systems')
        .delete()
        .eq('id', system.id)
        .eq('organization_id', organization.id)
        .eq('created_by', user.id)
        .eq('created_at', system.created_at);

      if (rollbackError) {
        console.warn('[ai-systems] creation_audit_compensation_failed', {
          code: rollbackError.code ?? 'unknown',
        });
      }

      return noStoreJson({ error: 'ai_system_creation_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ system, roleAssessment: result.roleAssessment });
  } catch (error) {
    return secureApiError(error);
  }
}
