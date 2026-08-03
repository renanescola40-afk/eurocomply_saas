import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getAiSystem } from '@/server/queries/ai-systems';
import {
  createArticle50AssessmentVersion,
  createArticle50Evidence,
  getArticle50Assessment,
  listArticle50Workspace,
  rollbackArticle50Assessment,
  rollbackArticle50Evidence,
} from '@/server/queries/article-50-workspace';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workflows = ['assessment_create', 'evidence_submit'] as const;
type Workflow = (typeof workflows)[number];

const nullableText = (max: number) =>
  z.preprocess(
    (value) => value === '' ? null : value,
    z.string().trim().max(max).nullable().optional(),
  );

const assessmentSchema = z.object({
  systemId: z.string().uuid(),
  placedOnMarketAt: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().date().nullable(),
  ),
  providerMachineReadableMarking: z.boolean(),
  deployerDisclosure: z.boolean(),
  finalAmendingActVerifiedInOfficialJournal: z.boolean(),
  officialJournalEvidenceId: nullableText(512),
  disclosureCopy: nullableText(8000),
  disclosureLanguage: nullableText(32),
  disclosureChannel: nullableText(64),
  displayEvidenceReference: nullableText(1024),
  markingEvidenceReference: nullableText(1024),
}).superRefine((value, context) => {
  if (
    value.finalAmendingActVerifiedInOfficialJournal &&
    !value.officialJournalEvidenceId
  ) {
    context.addIssue({
      code: 'custom',
      path: ['officialJournalEvidenceId'],
      message: 'Official Journal evidence is required for a verified transition claim.',
    });
  }

  if (value.providerMachineReadableMarking && !value.markingEvidenceReference) {
    context.addIssue({
      code: 'custom',
      path: ['markingEvidenceReference'],
      message: 'Marking evidence is required when machine-readable marking is claimed.',
    });
  }

  if (value.deployerDisclosure) {
    const required: Array<[keyof typeof value, string]> = [
      ['disclosureCopy', 'Disclosure copy is required.'],
      ['disclosureLanguage', 'Disclosure language is required.'],
      ['disclosureChannel', 'Disclosure channel is required.'],
      ['displayEvidenceReference', 'Proof of display is required.'],
    ];
    for (const [field, message] of required) {
      if (!value[field]) {
        context.addIssue({ code: 'custom', path: [field], message });
      }
    }
  }
});

const evidenceSchema = z.object({
  assessmentId: z.string().uuid(),
  evidenceType: z.enum([
    'placement_date',
    'machine_readable_marking',
    'human_readable_disclosure',
    'official_journal_source',
    'proof_of_display',
    'accessibility_validation',
    'translation_review',
  ]),
  storageReference: nullableText(1024),
  sha256Digest: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  ),
  sourceUrl: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().url().max(2048).refine((value) => value.startsWith('https://'), {
      message: 'Only HTTPS source URLs are accepted.',
    }).nullable().optional(),
  ),
  environment: z.enum(['local', 'ci', 'staging', 'production', 'customer']),
  limitations: z.array(z.string().trim().min(2).max(500)).max(20).default([]),
  validUntil: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().datetime({ offset: true }).nullable().optional(),
  ),
}).superRefine((value, context) => {
  if (!value.storageReference && !value.sha256Digest && !value.sourceUrl) {
    context.addIssue({
      code: 'custom',
      path: ['storageReference'],
      message: 'At least one evidence reference is required.',
    });
  }
  if (value.storageReference?.split('/').includes('..')) {
    context.addIssue({
      code: 'custom',
      path: ['storageReference'],
      message: 'Unsafe storage reference.',
    });
  }
});

function workflowOf(request: Request): Workflow | null {
  const value = new URL(request.url).searchParams.get('workflow');
  return workflows.includes(value as Workflow) ? value as Workflow : null;
}

function denied(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: { 'Retry-After': String(retryAfter) },
    },
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
    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_governance',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    return noStoreJson({
      ...(await listArticle50Workspace(organization.id)),
      role: permission.role,
      truthBoundary:
        'Workflow readiness is not legal certification, regulator approval or proof that customer evidence is accurate.',
    });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const workflow = workflowOf(request);
    if (!workflow) {
      return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    }

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
    if (!permission.ok) return permissionDeniedResponse(permission);

    const limit = await checkDistributedRateLimit({
      key: `article50:${workflow}:${organization.id}:${user.id}`,
      limit: workflow === 'evidence_submit' ? 20 : 10,
      windowMs: 60_000,
    });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'assessment_create') {
      const body = await parseJsonBodyWithZod(request, {
        schema: assessmentSchema,
        maxBytes: MAX_BYTES,
      });
      const system = await getAiSystem(body.systemId, organization.id);
      if (!system) {
        return noStoreJson({ error: 'ai_system_not_found' }, { status: 404 });
      }

      const assessment = await createArticle50AssessmentVersion({
        organizationId: organization.id,
        actorUserId: user.id,
        systemId: system.id,
        systemName: system.name,
        ...body,
      });

      const event = await audit(request, {
        organizationId: organization.id,
        userId: user.id,
        role: permission.role,
        action: 'article50_assessment_created',
        entityType: 'ai_article50_assessment',
        entityId: assessment.id,
        metadata: {
          aiSystemId: assessment.ai_system_id,
          version: assessment.version,
          status: assessment.status,
          legalSourceVersion: assessment.legal_source_version,
        },
      });
      if (!event.persisted) {
        await rollbackArticle50Assessment(organization.id, assessment.id);
        return noStoreJson({ error: 'article50_audit_unavailable' }, { status: 503 });
      }

      return noStoreJson({ assessment }, { status: 201 });
    }

    const body = await parseJsonBodyWithZod(request, {
      schema: evidenceSchema,
      maxBytes: MAX_BYTES,
    });
    const assessment = await getArticle50Assessment(organization.id, body.assessmentId);
    if (!assessment) {
      return noStoreJson({ error: 'article50_assessment_not_found' }, { status: 404 });
    }
    if (
      body.storageReference &&
      !body.storageReference.startsWith(`${organization.id}/`)
    ) {
      return noStoreJson({ error: 'article50_storage_scope_invalid' }, { status: 400 });
    }

    const evidence = await createArticle50Evidence({
      organizationId: organization.id,
      actorUserId: user.id,
      ...body,
    });
    const event = await audit(request, {
      organizationId: organization.id,
      userId: user.id,
      role: permission.role,
      action: 'article50_evidence_submitted',
      entityType: 'ai_article50_evidence',
      entityId: evidence.id,
      metadata: {
        assessmentId: assessment.id,
        evidenceType: evidence.evidence_type,
        environment: evidence.environment,
      },
    });
    if (!event.persisted) {
      await rollbackArticle50Evidence(organization.id, evidence.id);
      return noStoreJson({ error: 'article50_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({ evidence }, { status: 201 });
  } catch (error) {
    return secureApiError(error);
  }
}
