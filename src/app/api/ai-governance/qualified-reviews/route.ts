import { createHash } from 'node:crypto';
import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { createQualifiedReviewAssignment, createQualifiedReviewCampaign, createQualifiedReviewSubmission, exportQualifiedReviewEvidence, listQualifiedReviewApiSnapshot, registerQualifiedReviewer, transitionQualifiedReviewAssignment } from '@/server/queries/qualified-review-api';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workstreams = ['LEGAL-RULES','PROHIBITED-PRACTICES','ARTICLE-50','FRIA','DEPLOYER','HIGH-RISK-PROVIDER','CONFORMITY','GPAI'] as const;
const weights: Record<(typeof workstreams)[number], number> = { 'LEGAL-RULES': 4, 'PROHIBITED-PRACTICES': 7, 'ARTICLE-50': 8, FRIA: 6, DEPLOYER: 7, 'HIGH-RISK-PROVIDER': 9, CONFORMITY: 5, GPAI: 5 };
const workflows = ['campaign_create','reviewer_register','assignment_create','submission_create','assignment_transition','evidence_export'] as const;
type Workflow = (typeof workflows)[number];
const campaignSchema = z.object({ targetSha: z.string().regex(/^[a-f0-9]{40}$/) });
const reviewerSchema = z.object({ email: z.string().email().max(320), displayName: z.string().trim().min(2).max(160), qualificationSummary: z.string().trim().min(40).max(4000), qualificationEvidence: z.array(z.string().trim().min(3).max(1000)).min(1).max(20), independenceDeclared: z.literal(true) });
const assignmentSchema = z.object({ campaignId: z.string().uuid(), reviewerId: z.string().uuid(), workstreamId: z.enum(workstreams), dueAt: z.string().datetime({ offset: true }).nullable().optional() });
const submissionSchema = z.object({ assignmentId: z.string().uuid(), targetSha: z.string().regex(/^[a-f0-9]{40}$/), opinion: z.string().trim().min(40).max(20000), conclusion: z.enum(['accepted','accepted_with_conditions','changes_required','rejected']), scope: z.array(z.string().trim().min(3).max(500)).min(1).max(50), evidenceLocations: z.array(z.string().trim().min(3).max(1000)).min(1).max(50), limitations: z.array(z.string().trim().min(3).max(1000)).max(50), validUntil: z.string().datetime({ offset: true }) });
const transitionSchema = z.object({ assignmentId: z.string().uuid(), expectedVersion: z.number().int().positive(), nextStatus: z.enum(['in_review','submitted','accepted','changes_requested','rejected','expired','revoked']), reason: z.string().trim().min(20).max(4000).nullable().optional() });
const exportSchema = z.object({ campaignId: z.string().uuid() });
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
    return noStoreJson({ ...(await listQualifiedReviewApiSnapshot(organization.id)), role: permission.role, humanReviewRequired: true });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const workflow = workflowOf(request); if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `qualified-review:${workflow}:${organization.id}:${user.id}`, limit: workflow === 'evidence_export' ? 5 : 15, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'campaign_create') {
      const body = await parseJsonBodyWithZod(request, { schema: campaignSchema, maxBytes: MAX_BYTES });
      const campaign = await createQualifiedReviewCampaign({ organizationId: organization.id, actorUserId: user.id, targetSha: body.targetSha });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_review_campaign_created', entityType: 'qualified_review_campaign', entityId: campaign.id, metadata: { targetSha: body.targetSha } });
      if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
      return noStoreJson({ campaign }, { status: 201 });
    }
    if (workflow === 'reviewer_register') {
      const body = await parseJsonBodyWithZod(request, { schema: reviewerSchema, maxBytes: MAX_BYTES });
      const reviewer = await registerQualifiedReviewer({ organizationId: organization.id, actorUserId: user.id, ...body, email: body.email.toLowerCase() });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_reviewer_registered', entityType: 'qualified_reviewer', entityId: reviewer.id });
      if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
      return noStoreJson({ reviewer: { ...reviewer, email: undefined } }, { status: 201 });
    }
    if (workflow === 'assignment_create') {
      const body = await parseJsonBodyWithZod(request, { schema: assignmentSchema, maxBytes: MAX_BYTES });
      const assignment = await createQualifiedReviewAssignment({ organizationId: organization.id, actorUserId: user.id, ...body, weight: weights[body.workstreamId] });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_review_assignment_created', entityType: 'qualified_review_assignment', entityId: assignment.id, metadata: { workstreamId: body.workstreamId } });
      if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
      return noStoreJson({ assignment }, { status: 201 });
    }
    if (workflow === 'submission_create') {
      const body = await parseJsonBodyWithZod(request, { schema: submissionSchema, maxBytes: MAX_BYTES });
      if (new Date(body.validUntil) <= new Date()) return noStoreJson({ error: 'qualified_review_validity_required' }, { status: 400 });
      const integritySha256 = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const submission = await createQualifiedReviewSubmission({ organizationId: organization.id, actorUserId: user.id, ...body, integritySha256 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_review_submission_created', entityType: 'qualified_review_submission', entityId: submission.id, metadata: { integritySha256 } });
      if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
      return noStoreJson({ submission }, { status: 201 });
    }
    if (workflow === 'assignment_transition') {
      const body = await parseJsonBodyWithZod(request, { schema: transitionSchema, maxBytes: MAX_BYTES });
      const assignment = await transitionQualifiedReviewAssignment({ actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_review_assignment_transitioned', entityType: 'qualified_review_assignment', entityId: body.assignmentId, metadata: { nextStatus: body.nextStatus, expectedVersion: body.expectedVersion } });
      if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
      return noStoreJson({ assignment });
    }
    const body = await parseJsonBodyWithZod(request, { schema: exportSchema, maxBytes: MAX_BYTES });
    const evidence = await exportQualifiedReviewEvidence(organization.id, body.campaignId);
    if (!evidence) return noStoreJson({ error: 'qualified_review_campaign_not_found' }, { status: 404 });
    const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'qualified_review_evidence_exported', entityType: 'qualified_review_campaign', entityId: body.campaignId });
    if (!event.persisted) return noStoreJson({ error: 'qualified_review_audit_unavailable' }, { status: 503 });
    return noStoreJson({ evidence });
  } catch (error) { return secureApiError(error); }
}
