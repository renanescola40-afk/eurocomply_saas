import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { decideFria } from '@/server/ai-governance/fria-fundamental-rights';
import { getAiSystem } from '@/server/queries/ai-systems';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { createFriaAssessment, createFriaEvidence, getFriaAssessment, listFriaSnapshot, restoreFriaAssessment, rollbackFriaCreate, updateFriaAssessment } from '@/server/queries/fria';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workflows = ['assessment_create','assessment_update','assessment_approve','evidence_submit'] as const;
type Workflow = (typeof workflows)[number];
const nullableDate = z.preprocess((value) => value === '' ? null : value, z.string().datetime({ offset: true }).nullable().optional());
const jsonObject = z.record(z.string(), z.unknown()).default({});
const createSchema = z.object({ aiSystemId: z.string().uuid(), applicability: z.enum(['required','not_required','uncertain']), context: jsonObject, reviewDueAt: nullableDate });
const updateSchema = z.object({ assessmentId: z.string().uuid(), applicability: z.enum(['required','not_required','uncertain']), context: jsonObject, affectedGroups: z.array(z.unknown()).max(100), rightsMap: z.array(z.unknown()).max(100), impactAnalysis: jsonObject, mitigationPlan: jsonObject, oversightPlan: jsonObject, complaintsRedress: jsonObject, highestResidualImpact: z.enum(['none','low','medium','high','critical','unknown']), reviewerId: z.string().uuid().nullable().optional(), approverId: z.string().uuid().nullable().optional(), legalReviewComplete: z.boolean().default(false), monitoringPlanComplete: z.boolean().default(false), dataProtectionCoordinationComplete: z.boolean().default(false) });
const evidenceSchema = z.object({ assessmentId: z.string().uuid(), controlId: z.string().regex(/^FRIA-[0-9]{2}$/), evidenceType: z.string().trim().min(2).max(120), storageReference: z.string().trim().max(1024).nullable().optional(), sha256Digest: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional() }).superRefine((value, ctx) => { if (!value.storageReference && !value.sha256Digest) ctx.addIssue({ code: 'custom', path: ['storageReference'], message: 'Evidence reference or digest is required.' }); if (value.storageReference?.split('/').includes('..')) ctx.addIssue({ code: 'custom', path: ['storageReference'], message: 'Unsafe storage reference.' }); });
const approveSchema = z.object({ assessmentId: z.string().uuid(), rationale: z.string().trim().min(10).max(4000) });

function workflowOf(request: Request): Workflow | null { const value = new URL(request.url).searchParams.get('workflow'); return workflows.includes(value as Workflow) ? value as Workflow : null; }
function denied(result: RateLimitResult) { const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)); return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } }); }
async function audit(request: Request, input: { organizationId: string; userId: string; role: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) { return createAuditEvent({ organizationId: input.organizationId, actorUserId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: { ...input.metadata, actorRole: input.role }, requestContext: buildAuditRequestContextFromRequest(request) }); }

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'read_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    return noStoreJson({ ...(await listFriaSnapshot(organization.id)), role: permission.role });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const workflow = workflowOf(request); if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id); if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' }); if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `fria:${workflow}:${organization.id}:${user.id}`, limit: workflow === 'evidence_submit' ? 20 : 10, windowMs: 60_000 }); if (!limit.allowed) return denied(limit);

    if (workflow === 'assessment_create') {
      const body = await parseJsonBodyWithZod(request, { schema: createSchema, maxBytes: MAX_BYTES });
      const aiSystem = await getAiSystem(body.aiSystemId, organization.id);
      if (!aiSystem) return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      const assessment = await createFriaAssessment({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'fria_assessment_created', entityType: 'ai_fria_assessment', entityId: assessment.id, metadata: { aiSystemId: assessment.ai_system_id, version: assessment.version } });
      if (!event.persisted) { await rollbackFriaCreate('ai_fria_assessments', organization.id, assessment.id); return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ assessment }, { status: 201 });
    }

    if (workflow === 'evidence_submit') {
      const body = await parseJsonBodyWithZod(request, { schema: evidenceSchema, maxBytes: MAX_BYTES });
      if (!await getFriaAssessment(organization.id, body.assessmentId)) return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
      if (body.storageReference && !body.storageReference.startsWith(`${organization.id}/`)) return noStoreJson({ error: 'fria_storage_scope_invalid' }, { status: 400 });
      const evidence = await createFriaEvidence({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'fria_evidence_submitted', entityType: 'ai_fria_evidence', entityId: evidence.id, metadata: { assessmentId: evidence.assessment_id, controlId: evidence.control_id } });
      if (!event.persisted) { await rollbackFriaCreate('ai_fria_evidence', organization.id, evidence.id); return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ evidence }, { status: 201 });
    }

    const body = workflow === 'assessment_approve' ? await parseJsonBodyWithZod(request, { schema: approveSchema, maxBytes: MAX_BYTES }) : await parseJsonBodyWithZod(request, { schema: updateSchema, maxBytes: MAX_BYTES });
    const before = await getFriaAssessment(organization.id, body.assessmentId); if (!before) return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });

    if (workflow === 'assessment_approve') {
      if (before.approver_id !== user.id) return noStoreJson({ error: 'fria_approver_required' }, { status: 403 });
      const approvedAt = new Date().toISOString();
      const approved = decideFria({ applicability: before.applicability, publicAuthorityOrPublicService: Boolean(before.context?.publicAuthorityOrPublicService), highRiskSystem: Boolean(before.context?.highRiskSystem), intendedPurposeRecorded: Boolean(before.context?.intendedPurpose), affectedGroupsIdentified: Array.isArray(before.affected_groups) && before.affected_groups.length > 0, vulnerableGroupsConsidered: Boolean(before.context?.vulnerableGroupsConsidered), rightsMapped: Array.isArray(before.rights_map) && before.rights_map.length > 0, impactAssessmentComplete: Object.keys(before.impact_analysis ?? {}).length > 0, mitigationPlanComplete: Object.keys(before.mitigation_plan ?? {}).length > 0, humanOversightComplete: Object.keys(before.oversight_plan ?? {}).length > 0, complaintsAndRedressComplete: Object.keys(before.complaints_redress ?? {}).length > 0, monitoringPlanComplete: Boolean(before.monitoring_plan_id || before.context?.monitoringPlanComplete), dataProtectionCoordinationComplete: Boolean(before.context?.dataProtectionCoordinationComplete), highestResidualImpact: before.highest_residual_impact, accountableOwnerAssigned: Boolean(before.owner_id), independentReviewerAssigned: Boolean(before.reviewer_id), approverAssigned: Boolean(before.approver_id), legalReviewComplete: Boolean(before.legal_review_completed_at), approvedAt });
      if (!approved.productionUseAllowed) return noStoreJson({ error: 'fria_approval_requirements_not_met', missingControlIds: approved.missingControlIds }, { status: 409 });
      const assessment = await updateFriaAssessment(organization.id, before.id, { stage: 'approved', approved_at: approvedAt });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'fria_assessment_approved', entityType: 'ai_fria_assessment', entityId: before.id, metadata: { rationale: body.rationale } });
      if (!event.persisted) { await restoreFriaAssessment(before); return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ assessment });
    }

    const decision = decideFria({ applicability: body.applicability, publicAuthorityOrPublicService: Boolean(body.context.publicAuthorityOrPublicService), highRiskSystem: Boolean(body.context.highRiskSystem), intendedPurposeRecorded: Boolean(body.context.intendedPurpose), affectedGroupsIdentified: body.affectedGroups.length > 0, vulnerableGroupsConsidered: Boolean(body.context.vulnerableGroupsConsidered), rightsMapped: body.rightsMap.length > 0, impactAssessmentComplete: Object.keys(body.impactAnalysis).length > 0, mitigationPlanComplete: Object.keys(body.mitigationPlan).length > 0, humanOversightComplete: Object.keys(body.oversightPlan).length > 0, complaintsAndRedressComplete: Object.keys(body.complaintsRedress).length > 0, monitoringPlanComplete: body.monitoringPlanComplete, dataProtectionCoordinationComplete: body.dataProtectionCoordinationComplete, highestResidualImpact: body.highestResidualImpact, accountableOwnerAssigned: true, independentReviewerAssigned: Boolean(body.reviewerId), approverAssigned: Boolean(body.approverId), legalReviewComplete: body.legalReviewComplete });
    const assessment = await updateFriaAssessment(organization.id, before.id, { applicability: body.applicability, stage: decision.stage, context: { ...body.context, monitoringPlanComplete: body.monitoringPlanComplete, dataProtectionCoordinationComplete: body.dataProtectionCoordinationComplete }, affected_groups: body.affectedGroups, rights_map: body.rightsMap, impact_analysis: body.impactAnalysis, mitigation_plan: body.mitigationPlan, oversight_plan: body.oversightPlan, complaints_redress: body.complaintsRedress, highest_residual_impact: body.highestResidualImpact, reviewer_id: body.reviewerId ?? null, approver_id: body.approverId ?? null, legal_review_required: decision.legalReviewRequired, legal_review_completed_at: body.legalReviewComplete ? new Date().toISOString() : null });
    const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'fria_assessment_updated', entityType: 'ai_fria_assessment', entityId: before.id, metadata: { stage: decision.stage, missingControlIds: decision.missingControlIds } });
    if (!event.persisted) { await restoreFriaAssessment(before); return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 }); }
    return noStoreJson({ assessment, decision });
  } catch (error) { return secureApiError(error); }
}
