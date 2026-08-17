import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { validateFriaAssignmentMembers } from '@/server/ai-governance/fria-assignees';
import { decideFria } from '@/server/ai-governance/fria-fundamental-rights';
import { getAiSystem } from '@/server/queries/ai-systems';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  approveFriaAssessmentAtomic,
  compensateFriaApprovalAuditFailure,
  createFriaAssessment,
  createFriaEvidence,
  getFriaAssessment,
  listFriaSnapshot,
  restoreFriaAssessment,
  rollbackFriaCreate,
  updateFriaAssessment,
} from '@/server/queries/fria';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workflows = ['assessment_create', 'assessment_update', 'assessment_approve', 'evidence_submit'] as const;
type Workflow = (typeof workflows)[number];
const nullableDate = z.preprocess((value) => value === '' ? null : value, z.string().datetime({ offset: true }).nullable().optional());
const nullableUuid = z.preprocess((value) => value === '' ? null : value, z.string().uuid().nullable().optional());
const jsonObject = z.record(z.string(), z.unknown()).default({});
const createSchema = z.object({
  aiSystemId: z.string().uuid(),
  applicability: z.enum(['required', 'not_required', 'uncertain']),
  context: jsonObject,
  reviewDueAt: nullableDate,
});
const updateSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  applicability: z.enum(['required', 'not_required', 'uncertain']),
  context: jsonObject,
  affectedGroups: z.array(z.unknown()).max(100),
  rightsMap: z.array(z.unknown()).max(100),
  impactAnalysis: jsonObject,
  mitigationPlan: jsonObject,
  oversightPlan: jsonObject,
  complaintsRedress: jsonObject,
  highestResidualImpact: z.enum(['none', 'low', 'medium', 'high', 'critical', 'unknown']),
  reviewerId: nullableUuid,
  approverId: nullableUuid,
  legalReviewerId: nullableUuid,
  legalReviewComplete: z.boolean().default(false),
  monitoringPlanComplete: z.boolean().default(false),
  dataProtectionCoordinationComplete: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.legalReviewComplete && !value.legalReviewerId) {
    context.addIssue({ code: 'custom', path: ['legalReviewerId'], message: 'Legal reviewer is required.' });
  }
});
const evidenceSchema = z.object({
  assessmentId: z.string().uuid(),
  controlId: z.string().regex(/^FRIA-(0[1-9]|1[0-5])$/),
  evidenceType: z.string().trim().min(2).max(120),
  storageReference: z.string().trim().max(1024).nullable().optional(),
  sha256Digest: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
}).superRefine((value, context) => {
  if (!value.storageReference && !value.sha256Digest) {
    context.addIssue({ code: 'custom', path: ['storageReference'], message: 'Evidence reference or digest is required.' });
  }
  if (value.storageReference?.split('/').includes('..')) {
    context.addIssue({ code: 'custom', path: ['storageReference'], message: 'Unsafe storage reference.' });
  }
});
const approveSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  rationale: z.string().trim().min(10).max(4000),
});

function workflowOf(request: Request): Workflow | null {
  const value = new URL(request.url).searchParams.get('workflow');
  return workflows.includes(value as Workflow) ? value as Workflow : null;
}

function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    { error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
    { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

async function audit(request: Request, input: {
  organizationId: string;
  userId: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  return createAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { ...input.metadata, actorRole: input.role },
    requestContext: buildAuditRequestContextFromRequest(request),
  });
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
      minimumPlan: 'professional',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);
    return noStoreJson({ ...(await listFriaSnapshot(organization.id)), role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;
    const workflow = workflowOf(request);
    if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_governance',
      minimumPlan: 'professional',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({
      key: `fria:${workflow}:${organization.id}:${user.id}`,
      limit: workflow === 'evidence_submit' ? 20 : 10,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'assessment_create') {
      const body = await parseJsonBodyWithZod(request, { schema: createSchema, maxBytes: MAX_BYTES });
      const aiSystem = await getAiSystem(body.aiSystemId, organization.id);
      if (!aiSystem) return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      const created = await createFriaAssessment({ organizationId: organization.id, actorUserId: user.id, ...body });
      if (created.outcome === 'system_not_found') return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      if (created.outcome === 'actor_not_member') return noStoreJson({ error: 'organization_membership_required' }, { status: 403 });
      if (created.outcome !== 'created' || !created.assessment) return noStoreJson({ error: 'fria_create_rejected' }, { status: 400 });
      const assessment = created.assessment;
      const event = await audit(request, {
        organizationId: organization.id,
        userId: user.id,
        role: permission.role,
        action: 'fria_assessment_created',
        entityType: 'ai_fria_assessment',
        entityId: assessment.id,
        metadata: { aiSystemId: assessment.ai_system_id, version: assessment.version },
      });
      if (!event.persisted) {
        await rollbackFriaCreate('ai_fria_assessments', organization.id, assessment.id);
        return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ assessment }, { status: 201 });
    }

    if (workflow === 'evidence_submit') {
      const body = await parseJsonBodyWithZod(request, { schema: evidenceSchema, maxBytes: MAX_BYTES });
      if (!await getFriaAssessment(organization.id, body.assessmentId)) {
        return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
      }
      if (body.storageReference && !body.storageReference.startsWith(`${organization.id}/`)) {
        return noStoreJson({ error: 'fria_storage_scope_invalid' }, { status: 400 });
      }
      const evidence = await createFriaEvidence({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, {
        organizationId: organization.id,
        userId: user.id,
        role: permission.role,
        action: 'fria_evidence_submitted',
        entityType: 'ai_fria_evidence',
        entityId: evidence.id,
        metadata: { assessmentId: evidence.assessment_id, controlId: evidence.control_id },
      });
      if (!event.persisted) {
        await rollbackFriaCreate('ai_fria_evidence', organization.id, evidence.id);
        return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ evidence }, { status: 201 });
    }

    if (workflow === 'assessment_approve') {
      const body = await parseJsonBodyWithZod(request, { schema: approveSchema, maxBytes: MAX_BYTES });
      const before = await getFriaAssessment(organization.id, body.assessmentId);
      if (!before) return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
      if (before.stage === 'approved' || before.stage === 'retired') {
        return noStoreJson({ error: 'fria_assessment_immutable' }, { status: 409 });
      }
      const candidateApprovedAt = new Date().toISOString();
      const decision = decideFria({
        applicability: before.applicability,
        publicAuthorityOrPublicService: Boolean(before.context?.publicAuthorityOrPublicService),
        highRiskSystem: Boolean(before.context?.highRiskSystem),
        intendedPurposeRecorded: Boolean(before.context?.intendedPurpose),
        affectedGroupsIdentified: Array.isArray(before.affected_groups) && before.affected_groups.length > 0,
        vulnerableGroupsConsidered: Boolean(before.context?.vulnerableGroupsConsidered),
        rightsMapped: Array.isArray(before.rights_map) && before.rights_map.length > 0,
        impactAssessmentComplete: Object.keys(before.impact_analysis ?? {}).length > 0,
        mitigationPlanComplete: Object.keys(before.mitigation_plan ?? {}).length > 0,
        humanOversightComplete: Object.keys(before.oversight_plan ?? {}).length > 0,
        complaintsAndRedressComplete: Object.keys(before.complaints_redress ?? {}).length > 0,
        monitoringPlanComplete: Boolean(before.monitoring_plan_id || before.context?.monitoringPlanComplete),
        dataProtectionCoordinationComplete: Boolean(before.context?.dataProtectionCoordinationComplete),
        highestResidualImpact: before.highest_residual_impact,
        accountableOwnerAssigned: Boolean(before.owner_id),
        independentReviewerAssigned: Boolean(before.reviewer_id),
        approverAssigned: Boolean(before.approver_id),
        legalReviewComplete: Boolean(before.legal_reviewer_id && before.legal_review_completed_at),
        approvedAt: candidateApprovedAt,
      });
      const nonApplicabilityLegalReviewMissing = before.applicability === 'not_required'
        && (!before.legal_reviewer_id || !before.legal_review_completed_at);
      if (!decision.productionUseAllowed || nonApplicabilityLegalReviewMissing) {
        return noStoreJson({ error: 'fria_approval_requirements_not_met', missingControlIds: decision.missingControlIds }, { status: 409 });
      }
      const transition = await approveFriaAssessmentAtomic({
        organizationId: organization.id,
        assessmentId: before.id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        actorUserId: user.id,
        rationale: body.rationale,
      });
      if (transition.outcome === 'not_found') return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
      if (transition.outcome === 'state_changed') return noStoreJson({ error: 'fria_state_changed' }, { status: 409 });
      if (transition.outcome === 'approver_required') return noStoreJson({ error: 'fria_approver_required' }, { status: 403 });
      if (transition.outcome === 'requirements_not_met') return noStoreJson({ error: 'fria_approval_requirements_not_met' }, { status: 409 });
      if (transition.outcome !== 'approved' || !transition.assessment || !transition.decision_id) {
        return noStoreJson({ error: 'fria_approval_rejected' }, { status: 400 });
      }
      const assessment = transition.assessment;
      const event = await audit(request, {
        organizationId: organization.id,
        userId: user.id,
        role: permission.role,
        action: 'fria_assessment_approved',
        entityType: 'ai_fria_assessment',
        entityId: before.id,
        metadata: { decisionId: transition.decision_id, rationaleLength: body.rationale.length },
      });
      if (!event.persisted) {
        const compensation = await compensateFriaApprovalAuditFailure({
          organizationId: organization.id,
          assessmentId: before.id,
          decisionId: transition.decision_id,
          approvedUpdatedAt: assessment.updated_at,
          previousStage: before.stage,
          previousApprovedAt: before.approved_at,
          previousUpdatedAt: before.updated_at,
        });
        if (!compensation.compensated) {
          console.warn('[fria] approval_audit_compensation_failed', { errorCode: compensation.errorCode ?? 'unknown' });
        }
        return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ assessment });
    }

    const body = await parseJsonBodyWithZod(request, { schema: updateSchema, maxBytes: MAX_BYTES });
    const before = await getFriaAssessment(organization.id, body.assessmentId);
    if (!before) return noStoreJson({ error: 'fria_assessment_not_found' }, { status: 404 });
    if (before.stage === 'approved' || before.stage === 'retired') {
      return noStoreJson({ error: 'fria_assessment_immutable' }, { status: 409 });
    }

    const assignmentValidation = await validateFriaAssignmentMembers({
      organizationId: organization.id,
      selection: {
        ownerId: before.owner_id,
        reviewerId: body.reviewerId,
        approverId: body.approverId,
        legalReviewerId: body.legalReviewerId,
      },
    });
    if (!assignmentValidation.ok) {
      return noStoreJson(
        { error: assignmentValidation.error, field: assignmentValidation.field },
        { status: assignmentValidation.error === 'fria_assignee_not_eligible' ? 400 : 409 },
      );
    }

    const legalReviewComplete = Boolean(body.legalReviewComplete && body.legalReviewerId);
    const decision = decideFria({
      applicability: body.applicability,
      publicAuthorityOrPublicService: Boolean(body.context.publicAuthorityOrPublicService),
      highRiskSystem: Boolean(body.context.highRiskSystem),
      intendedPurposeRecorded: Boolean(body.context.intendedPurpose),
      affectedGroupsIdentified: body.affectedGroups.length > 0,
      vulnerableGroupsConsidered: Boolean(body.context.vulnerableGroupsConsidered),
      rightsMapped: body.rightsMap.length > 0,
      impactAssessmentComplete: Object.keys(body.impactAnalysis).length > 0,
      mitigationPlanComplete: Object.keys(body.mitigationPlan).length > 0,
      humanOversightComplete: Object.keys(body.oversightPlan).length > 0,
      complaintsAndRedressComplete: Object.keys(body.complaintsRedress).length > 0,
      monitoringPlanComplete: body.monitoringPlanComplete,
      dataProtectionCoordinationComplete: body.dataProtectionCoordinationComplete,
      highestResidualImpact: body.highestResidualImpact,
      accountableOwnerAssigned: true,
      independentReviewerAssigned: Boolean(body.reviewerId),
      approverAssigned: Boolean(body.approverId),
      legalReviewComplete,
    });
    const legalReviewRequired = decision.legalReviewRequired || body.applicability === 'not_required';
    const updated = await updateFriaAssessment(
      organization.id,
      before.id,
      body.expectedUpdatedAt,
      {
        applicability: body.applicability,
        stage: decision.stage,
        context: {
          ...body.context,
          monitoringPlanComplete: body.monitoringPlanComplete,
          dataProtectionCoordinationComplete: body.dataProtectionCoordinationComplete,
        },
        affected_groups: body.affectedGroups,
        rights_map: body.rightsMap,
        impact_analysis: body.impactAnalysis,
        mitigation_plan: body.mitigationPlan,
        oversight_plan: body.oversightPlan,
        complaints_redress: body.complaintsRedress,
        highest_residual_impact: body.highestResidualImpact,
        reviewer_id: body.reviewerId ?? null,
        approver_id: body.approverId ?? null,
        legal_reviewer_id: body.legalReviewerId ?? null,
        legal_review_required: legalReviewRequired,
        legal_review_completed_at: legalReviewComplete ? new Date().toISOString() : null,
      },
    );
    if (updated.status === 'conflict') return noStoreJson({ error: 'fria_state_changed' }, { status: 409 });
    const event = await audit(request, {
      organizationId: organization.id,
      userId: user.id,
      role: permission.role,
      action: 'fria_assessment_updated',
      entityType: 'ai_fria_assessment',
      entityId: before.id,
      metadata: { stage: decision.stage, missingControlIds: decision.missingControlIds },
    });
    if (!event.persisted) {
      const rollback = await restoreFriaAssessment(before, updated.assessment.updated_at);
      if (!rollback.restored) {
        console.warn('[fria] update_audit_compensation_failed', { errorCode: rollback.errorCode ?? 'unknown' });
      }
      return noStoreJson({ error: 'fria_audit_unavailable' }, { status: 503 });
    }
    return noStoreJson({ assessment: updated.assessment, decision });
  } catch (error) {
    return secureApiError(error);
  }
}
