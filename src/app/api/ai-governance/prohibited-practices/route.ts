import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import {
  approveProhibitedPracticesReview,
  createProhibitedPracticeEvidence,
  createProhibitedPracticesReview,
  listProhibitedPracticesSnapshot,
  rollbackProhibitedPracticeCreate,
  updateProhibitedPracticeSignal,
} from '@/server/queries/prohibited-practices';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const signals = ['subliminal_manipulation','vulnerability_exploitation','social_scoring','criminal_risk_prediction','untargeted_facial_scraping','emotion_inference_workplace_education','biometric_categorisation_sensitive_traits','real_time_remote_biometric_public_space'] as const;
const workflows = ['review_create','signal_update','evidence_submit','review_approve'] as const;
type Workflow = (typeof workflows)[number];

const createSchema = z.object({
  systemReference: z.string().trim().min(3).max(240),
  applicability: z.enum(['required','not_required','uncertain']),
});
const signalSchema = z.object({
  reviewId: z.string().uuid(),
  signalCode: z.enum(signals),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  answer: z.enum(['yes','no','unknown']),
  legalConclusion: z.enum(['not_prohibited','prohibited','exception_supported','uncertain']),
  rationale: z.string().trim().min(10).max(4000),
  deploymentContext: z.string().trim().min(10).max(4000),
  consequenceAnalysis: z.string().trim().min(10).max(4000),
  exceptionClaimed: z.boolean(),
  reviewerUserId: z.string().uuid(),
  legalReviewerUserId: z.string().uuid().nullable().optional(),
  contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((value, ctx) => {
  if (value.answer === 'yes' && !value.legalReviewerUserId) ctx.addIssue({ code: 'custom', path: ['legalReviewerUserId'], message: 'Legal reviewer is required for positive signals.' });
  if (value.legalConclusion === 'exception_supported' && !value.exceptionClaimed) ctx.addIssue({ code: 'custom', path: ['exceptionClaimed'], message: 'Exception claim is required.' });
});
const evidenceSchema = z.object({
  reviewId: z.string().uuid(), signalAssessmentId: z.string().uuid(),
  evidenceType: z.enum(['intended_purpose','context_record','capability_inventory','data_source_inventory','harm_analysis','rights_assessment','legal_analysis','authorization','necessity_proportionality','audit_record','external_report','other']),
  evidenceReference: z.string().trim().min(3).max(1000), sourceVersion: z.string().trim().min(1).max(160),
  evidenceDigest: z.string().regex(/^[a-f0-9]{64}$/),
});
const approveSchema = z.object({ reviewId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }), rationale: z.string().trim().min(10).max(4000) });

function workflowOf(request: Request): Workflow | null {
  const value = new URL(request.url).searchParams.get('workflow');
  return workflows.includes(value as Workflow) ? value as Workflow : null;
}
function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } });
}
async function audit(request: Request, input: { organizationId: string; userId: string; role: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) {
  return createAuditEvent({ organizationId: input.organizationId, actorUserId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: { ...input.metadata, actorRole: input.role }, requestContext: buildAuditRequestContextFromRequest(request) });
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'read_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    return noStoreJson({ ...(await listProhibitedPracticesSnapshot(organization.id)), role: permission.role });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const workflow = workflowOf(request); if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id); if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `prohibited-practices:${workflow}:${organization.id}:${user.id}`, limit: workflow === 'evidence_submit' ? 20 : 10, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'review_create') {
      const body = await parseJsonBodyWithZod(request, { schema: createSchema, maxBytes: MAX_BYTES });
      const transition = await createProhibitedPracticesReview({ organizationId: organization.id, actorUserId: user.id, ...body });
      if (transition?.outcome === 'actor_not_member') return noStoreJson({ error: 'organization_membership_required' }, { status: 403 });
      if (transition?.outcome !== 'created' || !transition.review) return noStoreJson({ error: 'prohibited_review_create_rejected' }, { status: 400 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'prohibited_practice_review_created', entityType: 'ai_prohibited_practice_review', entityId: transition.review.id });
      if (!event.persisted) { await rollbackProhibitedPracticeCreate('ai_prohibited_practice_reviews', organization.id, transition.review.id); return noStoreJson({ error: 'prohibited_practices_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ review: transition.review }, { status: 201 });
    }

    if (workflow === 'signal_update') {
      const body = await parseJsonBodyWithZod(request, { schema: signalSchema, maxBytes: MAX_BYTES });
      const signal = await updateProhibitedPracticeSignal({ organizationId: organization.id, reviewId: body.reviewId, signalCode: body.signalCode, expectedUpdatedAt: body.expectedUpdatedAt, patch: {
        answer: body.answer, legal_conclusion: body.legalConclusion,
        status: body.answer === 'yes' && body.legalConclusion === 'prohibited' ? 'prohibited' : 'evidence_review',
        rationale: body.rationale, deployment_context: body.deploymentContext, consequence_analysis: body.consequenceAnalysis,
        exception_claimed: body.exceptionClaimed, reviewer_user_id: body.reviewerUserId,
        legal_reviewer_user_id: body.legalReviewerUserId ?? null, content_digest: body.contentDigest,
        reviewed_at: new Date().toISOString(), legal_reviewed_at: body.legalReviewerUserId ? new Date().toISOString() : null,
        last_material_change_at: new Date().toISOString(),
      } });
      if (!signal) return noStoreJson({ error: 'prohibited_practice_state_changed' }, { status: 409 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'prohibited_practice_signal_updated', entityType: 'ai_prohibited_practice_signal', entityId: signal.id, metadata: { signalCode: body.signalCode } });
      if (!event.persisted) return noStoreJson({ error: 'prohibited_practices_audit_unavailable' }, { status: 503 });
      return noStoreJson({ signal });
    }

    if (workflow === 'evidence_submit') {
      const body = await parseJsonBodyWithZod(request, { schema: evidenceSchema, maxBytes: MAX_BYTES });
      if (!body.evidenceReference.startsWith(`${organization.id}/`)) return noStoreJson({ error: 'prohibited_evidence_scope_invalid' }, { status: 400 });
      const evidence = await createProhibitedPracticeEvidence({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'prohibited_practice_evidence_submitted', entityType: 'ai_prohibited_practice_evidence', entityId: evidence.id });
      if (!event.persisted) { await rollbackProhibitedPracticeCreate('ai_prohibited_practice_evidence', organization.id, evidence.id); return noStoreJson({ error: 'prohibited_practices_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ evidence }, { status: 201 });
    }

    const body = await parseJsonBodyWithZod(request, { schema: approveSchema, maxBytes: MAX_BYTES });
    const transition = await approveProhibitedPracticesReview({ organizationId: organization.id, actorUserId: user.id, ...body });
    if (transition?.outcome === 'not_found') return noStoreJson({ error: 'prohibited_review_not_found' }, { status: 404 });
    if (transition?.outcome === 'state_changed') return noStoreJson({ error: 'prohibited_practice_state_changed' }, { status: 409 });
    if (transition?.outcome === 'approver_required') return noStoreJson({ error: 'prohibited_practice_approver_required' }, { status: 403 });
    if (transition?.outcome !== 'approved' || !transition.review) return noStoreJson({ error: 'prohibited_practice_approval_requirements_not_met' }, { status: 409 });
    const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'prohibited_practice_review_approved', entityType: 'ai_prohibited_practice_review', entityId: transition.review.id, metadata: { decisionId: transition.decision_id, rationaleLength: body.rationale.length } });
    if (!event.persisted) return noStoreJson({ error: 'prohibited_practices_audit_unavailable' }, { status: 503 });
    return noStoreJson({ review: transition.review });
  } catch (error) { return secureApiError(error); }
}
