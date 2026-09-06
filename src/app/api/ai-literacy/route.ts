import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import {
  completeAiLiteracyAssignment,
  createAiLiteracyAssignment,
  createAiLiteracyCourse,
  createAiLiteracyEvidence,
  createAiLiteracyProgram,
  listAiLiteracySnapshot,
  rollbackAiLiteracyCreate,
} from '@/server/queries/ai-literacy';
import {
  getAiLiteracyAssignmentForUpdate,
  restoreAiLiteracyAssignment,
} from '@/server/queries/ai-literacy-compensation';
import {
  activateAiLiteracyProgram,
  getAiLiteracyCourse,
  getAiLiteracyProgram,
  getPublishedAiLiteracyCourse,
  publishAiLiteracyCourse,
  restoreAiLiteracyCourse,
  restoreAiLiteracyEvidence,
  restoreAiLiteracyProgram,
  reviewAiLiteracyEvidence,
} from '@/server/queries/ai-literacy-workflow';
import {
  buildAuditRequestContextFromRequest,
  createAuditEvent,
} from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

const AI_LITERACY_JSON_MAX_BYTES = 64 * 1024;
const AI_LITERACY_WORKFLOWS = [
  'program_create',
  'program_activate',
  'course_create',
  'course_publish',
  'assignment_create',
  'assignment_complete',
  'evidence_submit',
  'evidence_review',
] as const;

type AiLiteracyWorkflow = (typeof AI_LITERACY_WORKFLOWS)[number];
type CreateTable = 'ai_literacy_programs' | 'ai_literacy_courses' | 'ai_literacy_assignments' | 'ai_literacy_evidence';

const nullableUuidSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().uuid().nullable().optional(),
);

const nullableDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().datetime({ offset: true }).nullable().optional(),
);

const trimmedStringArray = z.array(z.string().trim().min(1).max(100)).max(40).default([]);

const programCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional().nullable(),
  ownerUserId: nullableUuidSchema,
  reviewDueAt: nullableDateSchema,
});

const programActivateSchema = z.object({
  programId: z.string().uuid(),
});

const courseModuleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(1).max(12_000),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
});

const courseCreateSchema = z.object({
  programId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(4000).optional().nullable(),
  version: z.string().trim().min(1).max(40),
  audienceRoles: trimmedStringArray,
  riskLevels: trimmedStringArray,
  departments: trimmedStringArray,
  modules: z.array(courseModuleSchema).min(1).max(50),
  passingScore: z.number().int().min(0).max(100).optional().nullable(),
  validityDays: z.number().int().min(1).max(3650).optional().nullable(),
});

const coursePublishSchema = z.object({
  courseId: z.string().uuid(),
});

const assignmentCreateSchema = z.object({
  courseId: z.string().uuid(),
  assigneeUserId: nullableUuidSchema,
  assigneeEmail: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().trim().email().max(320).nullable().optional(),
  ),
  assigneeType: z.enum(['employee', 'contractor', 'other']).default('employee'),
  roleTitle: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(160).optional().nullable(),
  dueAt: nullableDateSchema,
}).superRefine((value, context) => {
  if (!value.assigneeUserId && !value.assigneeEmail) {
    context.addIssue({
      code: 'custom',
      path: ['assigneeUserId'],
      message: 'An assignee user or email is required.',
    });
  }
});

const assignmentCompleteSchema = z.object({
  assignmentId: z.string().uuid(),
  completedAt: nullableDateSchema,
  score: z.number().int().min(0).max(100).optional().nullable(),
});

const httpsUrlSchema = z.string().trim().url().max(2048).refine((value) => new URL(value).protocol === 'https:', {
  message: 'Only HTTPS evidence URLs are accepted.',
});

const evidenceSubmitSchema = z.object({
  assignmentId: z.string().uuid(),
  evidenceType: z.enum(['completion_record', 'assessment_result', 'attendance', 'acknowledgement', 'certificate', 'other']),
  title: z.string().trim().min(3).max(180),
  storagePath: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().trim().min(3).max(1024).nullable().optional(),
  ),
  externalUrl: z.preprocess(
    (value) => (value === '' ? null : value),
    httpsUrlSchema.nullable().optional(),
  ),
  sha256: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  ),
  mimeType: z.string().trim().max(160).optional().nullable(),
  issuedAt: nullableDateSchema,
  validUntil: nullableDateSchema,
}).superRefine((value, context) => {
  if (!value.storagePath && !value.externalUrl) {
    context.addIssue({ code: 'custom', path: ['storagePath'], message: 'Evidence location is required.' });
  }
  if (value.storagePath?.split('/').includes('..')) {
    context.addIssue({ code: 'custom', path: ['storagePath'], message: 'Unsafe storage path.' });
  }
});

const evidenceReviewSchema = z.object({
  evidenceId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().trim().max(4000).optional().nullable(),
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

function parseWorkflow(request: Request): AiLiteracyWorkflow | null {
  const workflow = new URL(request.url).searchParams.get('workflow');
  return AI_LITERACY_WORKFLOWS.includes(workflow as AiLiteracyWorkflow)
    ? (workflow as AiLiteracyWorkflow)
    : null;
}

function addDays(isoTimestamp: string, days: number | null) {
  if (!days) return null;
  const timestamp = Date.parse(isoTimestamp);
  if (Number.isNaN(timestamp)) throw new Error('ai_literacy_completion_date_invalid');
  return new Date(timestamp + days * 24 * 60 * 60 * 1000).toISOString();
}

async function auditCreateOrRollback(input: {
  request: Request;
  organizationId: string;
  actorUserId: string;
  actorRole: string;
  table: CreateTable;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const audit = await createAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { ...input.metadata, actorRole: input.actorRole },
    requestContext: buildAuditRequestContextFromRequest(input.request),
  });

  if (audit.persisted) return null;

  const rollback = await rollbackAiLiteracyCreate(input.table, input.organizationId, input.entityId);
  if (!rollback.rolledBack) {
    console.warn('[ai-literacy] audit_compensation_failed', {
      entityType: input.entityType,
      errorCode: rollback.errorCode ?? 'unknown',
    });
  }

  return noStoreJson({ error: 'ai_literacy_audit_unavailable' }, { status: 503 });
}

async function persistTransitionAudit(input: {
  request: Request;
  organizationId: string;
  actorUserId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  return createAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { ...input.metadata, actorRole: input.actorRole },
    requestContext: buildAuditRequestContextFromRequest(input.request),
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
      minimumPlan: 'business',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const asOf = new URL(request.url).searchParams.get('asOf') ?? new Date().toISOString();
    const parsedAsOf = z.string().datetime({ offset: true }).safeParse(asOf);
    if (!parsedAsOf.success) return noStoreJson({ error: 'invalid_as_of' }, { status: 400 });

    const snapshot = await listAiLiteracySnapshot(organization.id, parsedAsOf.data);
    return noStoreJson({ ...snapshot, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const workflow = parseWorkflow(request);
    if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_governance',
      minimumPlan: 'business',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const rateLimit = await checkDistributedRateLimit({
      key: `ai-literacy:${workflow}:${organization.id}:${user.id}`,
      limit: workflow === 'evidence_submit' ? 20 : 12,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) return rateLimitDeniedResponse(rateLimit);

    if (workflow === 'program_create') {
      const body = await parseJsonBodyWithZod(request, { schema: programCreateSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const program = await createAiLiteracyProgram({
        organizationId: organization.id,
        actorUserId: user.id,
        title: body.title,
        description: body.description,
        ownerUserId: body.ownerUserId,
        reviewDueAt: body.reviewDueAt,
      });
      const auditFailure = await auditCreateOrRollback({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        table: 'ai_literacy_programs',
        entityType: 'ai_literacy_program',
        entityId: program.id,
        action: 'ai_literacy_program_created',
        metadata: { articleReference: program.article_reference },
      });
      return auditFailure ?? noStoreJson({ program }, { status: 201 });
    }

    if (workflow === 'program_activate') {
      const body = await parseJsonBodyWithZod(request, { schema: programActivateSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const before = await getAiLiteracyProgram(organization.id, body.programId);
      if (!before) return noStoreJson({ error: 'ai_literacy_program_not_found' }, { status: 404 });
      if (before.status !== 'draft') return noStoreJson({ error: 'ai_literacy_program_transition_invalid' }, { status: 409 });

      const program = await activateAiLiteracyProgram(organization.id, body.programId);
      if (!program) return noStoreJson({ error: 'ai_literacy_program_transition_conflict' }, { status: 409 });
      const audit = await persistTransitionAudit({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        entityType: 'ai_literacy_program',
        entityId: program.id,
        action: 'ai_literacy_program_activated',
      });
      if (!audit.persisted) {
        const rollback = await restoreAiLiteracyProgram(before);
        if (!rollback.restored) console.warn('[ai-literacy] program_activation_compensation_failed', { errorCode: rollback.errorCode ?? 'unknown' });
        return noStoreJson({ error: 'ai_literacy_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ program });
    }

    if (workflow === 'course_create') {
      const body = await parseJsonBodyWithZod(request, { schema: courseCreateSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const program = await getAiLiteracyProgram(organization.id, body.programId);
      if (!program) return noStoreJson({ error: 'ai_literacy_program_not_found' }, { status: 404 });

      const course = await createAiLiteracyCourse({
        organizationId: organization.id,
        actorUserId: user.id,
        programId: body.programId,
        title: body.title,
        description: body.description,
        version: body.version,
        audienceRoles: body.audienceRoles,
        riskLevels: body.riskLevels,
        departments: body.departments,
        modules: body.modules,
        passingScore: body.passingScore,
        validityDays: body.validityDays,
      });
      const auditFailure = await auditCreateOrRollback({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        table: 'ai_literacy_courses',
        entityType: 'ai_literacy_course',
        entityId: course.id,
        action: 'ai_literacy_course_created',
        metadata: { programId: course.program_id, version: course.version, moduleCount: course.modules.length },
      });
      return auditFailure ?? noStoreJson({ course }, { status: 201 });
    }

    if (workflow === 'course_publish') {
      const body = await parseJsonBodyWithZod(request, { schema: coursePublishSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const before = await getAiLiteracyCourse(organization.id, body.courseId);
      if (!before) return noStoreJson({ error: 'ai_literacy_course_not_found' }, { status: 404 });
      if (before.status !== 'draft') return noStoreJson({ error: 'ai_literacy_course_transition_invalid' }, { status: 409 });

      const course = await publishAiLiteracyCourse(organization.id, body.courseId);
      if (!course) return noStoreJson({ error: 'ai_literacy_course_publish_requirements_not_met' }, { status: 409 });
      const audit = await persistTransitionAudit({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        entityType: 'ai_literacy_course',
        entityId: course.id,
        action: 'ai_literacy_course_published',
        metadata: { programId: course.program_id, version: course.version },
      });
      if (!audit.persisted) {
        const rollback = await restoreAiLiteracyCourse(before);
        if (!rollback.restored) console.warn('[ai-literacy] course_publish_compensation_failed', { errorCode: rollback.errorCode ?? 'unknown' });
        return noStoreJson({ error: 'ai_literacy_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ course });
    }

    if (workflow === 'assignment_create') {
      const body = await parseJsonBodyWithZod(request, { schema: assignmentCreateSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const course = await getPublishedAiLiteracyCourse(organization.id, body.courseId);
      if (!course) return noStoreJson({ error: 'published_ai_literacy_course_required' }, { status: 409 });

      const assignment = await createAiLiteracyAssignment({
        organizationId: organization.id,
        actorUserId: user.id,
        courseId: body.courseId,
        assigneeUserId: body.assigneeUserId,
        assigneeEmail: body.assigneeEmail,
        assigneeType: body.assigneeType,
        roleTitle: body.roleTitle,
        department: body.department,
        dueAt: body.dueAt,
      });
      const auditFailure = await auditCreateOrRollback({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        table: 'ai_literacy_assignments',
        entityType: 'ai_literacy_assignment',
        entityId: assignment.id,
        action: 'ai_literacy_assignment_created',
        metadata: { courseId: assignment.course_id, assigneeType: assignment.assignee_type },
      });
      return auditFailure ?? noStoreJson({ assignment }, { status: 201 });
    }

    if (workflow === 'assignment_complete') {
      const body = await parseJsonBodyWithZod(request, { schema: assignmentCompleteSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const before = await getAiLiteracyAssignmentForUpdate(organization.id, body.assignmentId);
      if (!before) return noStoreJson({ error: 'ai_literacy_assignment_not_found' }, { status: 404 });
      if (!['assigned', 'in_progress'].includes(before.status)) return noStoreJson({ error: 'ai_literacy_assignment_transition_invalid' }, { status: 409 });

      const course = await getPublishedAiLiteracyCourse(organization.id, before.course_id);
      if (!course) return noStoreJson({ error: 'published_ai_literacy_course_required' }, { status: 409 });
      const completedAt = body.completedAt ?? new Date().toISOString();
      const assignment = await completeAiLiteracyAssignment({
        organizationId: organization.id,
        assignmentId: before.id,
        completedAt,
        score: body.score,
        validUntil: addDays(completedAt, course.validity_days),
      });
      const audit = await persistTransitionAudit({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        entityType: 'ai_literacy_assignment',
        entityId: assignment.id,
        action: 'ai_literacy_assignment_completed',
        metadata: { courseId: assignment.course_id, score: assignment.score },
      });
      if (!audit.persisted) {
        const rollback = await restoreAiLiteracyAssignment(before);
        if (!rollback.restored) console.warn('[ai-literacy] assignment_completion_compensation_failed', { errorCode: rollback.errorCode ?? 'unknown' });
        return noStoreJson({ error: 'ai_literacy_audit_unavailable' }, { status: 503 });
      }
      return noStoreJson({ assignment });
    }

    if (workflow === 'evidence_submit') {
      const body = await parseJsonBodyWithZod(request, { schema: evidenceSubmitSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
      const assignment = await getAiLiteracyAssignmentForUpdate(organization.id, body.assignmentId);
      if (!assignment) return noStoreJson({ error: 'ai_literacy_assignment_not_found' }, { status: 404 });
      if (body.storagePath && !body.storagePath.startsWith(`${organization.id}/`)) {
        return noStoreJson({ error: 'ai_literacy_storage_path_scope_invalid' }, { status: 400 });
      }

      const evidence = await createAiLiteracyEvidence({
        organizationId: organization.id,
        actorUserId: user.id,
        assignmentId: body.assignmentId,
        evidenceType: body.evidenceType,
        title: body.title,
        storagePath: body.storagePath,
        externalUrl: body.externalUrl,
        sha256: body.sha256,
        mimeType: body.mimeType,
        issuedAt: body.issuedAt,
        validUntil: body.validUntil,
      });
      const auditFailure = await auditCreateOrRollback({
        request,
        organizationId: organization.id,
        actorUserId: user.id,
        actorRole: permission.role,
        table: 'ai_literacy_evidence',
        entityType: 'ai_literacy_evidence',
        entityId: evidence.id,
        action: 'ai_literacy_evidence_submitted',
        metadata: { assignmentId: evidence.assignment_id, evidenceType: evidence.evidence_type },
      });
      return auditFailure ?? noStoreJson({ evidence }, { status: 201 });
    }

    const body = await parseJsonBodyWithZod(request, { schema: evidenceReviewSchema, maxBytes: AI_LITERACY_JSON_MAX_BYTES });
    const reviewed = await reviewAiLiteracyEvidence({
      organizationId: organization.id,
      evidenceId: body.evidenceId,
      reviewerUserId: user.id,
      decision: body.decision,
      reviewNotes: body.reviewNotes,
    });
    if (!reviewed) return noStoreJson({ error: 'ai_literacy_evidence_review_not_allowed' }, { status: 409 });

    const audit = await persistTransitionAudit({
      request,
      organizationId: organization.id,
      actorUserId: user.id,
      actorRole: permission.role,
      entityType: 'ai_literacy_evidence',
      entityId: reviewed.evidence.id,
      action: body.decision === 'approved' ? 'ai_literacy_evidence_approved' : 'ai_literacy_evidence_rejected',
      metadata: { assignmentId: reviewed.evidence.assignment_id },
    });
    if (!audit.persisted) {
      const rollback = await restoreAiLiteracyEvidence(reviewed.before);
      if (!rollback.restored) console.warn('[ai-literacy] evidence_review_compensation_failed', { errorCode: rollback.errorCode ?? 'unknown' });
      return noStoreJson({ error: 'ai_literacy_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ evidence: reviewed.evidence });
  } catch (error) {
    return secureApiError(error);
  }
}
