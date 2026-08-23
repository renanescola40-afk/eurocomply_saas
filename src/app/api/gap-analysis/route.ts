import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

const GAP_JSON_MAX_BYTES = 96 * 1024;

const answerSchema = z.object({
  question_id: z.string().trim().min(1).max(120),
  article: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(160),
  answer: z.enum(['yes', 'partial', 'no']),
  score: z.union([z.literal(0), z.literal(50), z.literal(100)]),
  recommendation: z.string().trim().max(3000).optional(),
});

const assessmentSchema = z.object({
  locale: z.string().trim().min(2).max(12),
  score: z.number().int().min(0).max(100),
  summary: z.record(z.string(), z.unknown()),
  answers: z.array(answerSchema).max(80),
});

const remediationActionSchema = z.object({
  article: z.string().trim().min(1).max(120),
  title: z.string().trim().max(240).optional(),
  recommendation: z.string().trim().min(1).max(3000),
  severity: z.enum(['critical', 'medium']),
});

const remediationSchema = z.object({
  assessmentId: z.string().uuid(),
  actions: z.array(remediationActionSchema).max(80),
});

function dueDateForSeverity(severity: 'critical' | 'medium') {
  const date = new Date();
  date.setDate(date.getDate() + (severity === 'critical' ? 30 : 60));
  return date.toISOString().slice(0, 10);
}

function buildFindingTitle(action: z.infer<typeof remediationActionSchema>) {
  return action.title || `${action.article} compliance gap`;
}

function buildTaskTitle(action: z.infer<typeof remediationActionSchema>) {
  return action.severity === 'critical'
    ? `Resolve critical gap: ${action.article}`
    : `Improve control: ${action.article}`;
}

async function requireGapOrganizationPermission(userId: string, permission: 'read_ai_governance' | 'manage_ai_governance') {
  const organization = await getCurrentOrganizationForUser(userId);
  if (!organization) {
    return { denied: noStoreJson({ error: 'organization_required' }, { status: 403 }) } as const;
  }

  const authorization = await assertOrganizationPermission({
    userId,
    organizationId: organization.id,
    permission,
  });

  if (!authorization.ok) {
    return { denied: permissionDeniedResponse(authorization) } as const;
  }

  return { organization, authorization } as const;
}

async function loadLatestAssessment(organizationId: string, userId: string) {
  const { data, error } = await createAdminClient()
    .from('gap_assessments')
    .select('id,score,status,locale,summary,created_at')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function loadAssessmentHistory(organizationId: string, userId: string, limit: number) {
  const { data, error } = await createAdminClient()
    .from('gap_assessments')
    .select('id,score,status,locale,summary,created_at')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

async function loadOpenWork(organizationId: string, userId: string) {
  const supabase = createAdminClient();
  const [{ data: findings, error: findingsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase
      .from('compliance_findings')
      .select('id,article,title,severity,status,due_date,created_at')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }),
    supabase
      .from('compliance_tasks')
      .select('id,finding_id,title,priority,status,due_date,created_at')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }),
  ]);

  if (findingsError) throw findingsError;
  if (tasksError) throw tasksError;
  return { findings: findings ?? [], tasks: tasks ?? [] };
}

async function saveAssessment(organizationId: string, userId: string, body: z.infer<typeof assessmentSchema>) {
  const supabase = createAdminClient();
  const { data: assessment, error: assessmentError } = await supabase
    .from('gap_assessments')
    .insert({
      organization_id: organizationId,
      workspace_id: null,
      user_id: userId,
      locale: body.locale,
      score: body.score,
      status: 'completed',
      summary: body.summary,
    })
    .select('id')
    .single();

  if (assessmentError) throw assessmentError;
  if (!assessment?.id) throw new Error('gap_assessment_create_failed');

  try {
    if (body.answers.length > 0) {
      const { error: answersError } = await supabase.from('gap_answers').insert(
        body.answers.map((answer) => ({
          assessment_id: assessment.id,
          workspace_id: null,
          ...answer,
        })),
      );
      if (answersError) throw answersError;
    }

    const audit = await createAuditEvent({
      organizationId,
      actorUserId: userId,
      action: 'gap_analysis.saved',
      entityType: 'gap_assessment',
      entityId: assessment.id,
      metadata: { score: body.score, answers: body.answers.length },
    });

    if (!audit.persisted) throw new Error('gap_assessment_audit_unavailable');
    return assessment.id as string;
  } catch (error) {
    const { error: rollbackError } = await supabase
      .from('gap_assessments')
      .delete()
      .eq('id', assessment.id)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (rollbackError) {
      console.warn('[gap-analysis] assessment_compensation_failed', { code: rollbackError.code ?? 'unknown' });
    }
    throw error;
  }
}

async function createRemediation(organizationId: string, userId: string, body: z.infer<typeof remediationSchema>) {
  const actions = body.actions.filter((action) => action.recommendation.trim().length > 0);
  if (actions.length === 0) return { findingsCreated: 0, tasksCreated: 0 };

  const supabase = createAdminClient();
  const { data: assessment, error: assessmentError } = await supabase
    .from('gap_assessments')
    .select('id')
    .eq('id', body.assessmentId)
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (assessmentError) throw assessmentError;
  if (!assessment) throw new Error('gap_assessment_not_found');

  const findingRows = actions.map((action) => ({
    organization_id: organizationId,
    workspace_id: null,
    assessment_id: body.assessmentId,
    user_id: userId,
    article: action.article,
    title: buildFindingTitle(action),
    description: action.recommendation,
    recommendation: action.recommendation,
    severity: action.severity,
    status: 'open',
    source: 'gap_analysis',
    due_date: dueDateForSeverity(action.severity),
    metadata: { generated_from: 'gap_analysis' },
  }));

  const { data: findings, error: findingsError } = await supabase
    .from('compliance_findings')
    .insert(findingRows)
    .select('id,article,recommendation,severity');

  if (findingsError) throw findingsError;
  const insertedFindings = findings ?? [];

  try {
    const taskRows = insertedFindings.map((finding, index) => {
      const action = actions[index];
      return {
        organization_id: organizationId,
        workspace_id: null,
        finding_id: finding.id,
        user_id: userId,
        title: buildTaskTitle(action),
        description: finding.recommendation || action.recommendation,
        category: 'gap_analysis',
        priority: action.severity === 'critical' ? 'critical' : 'medium',
        status: 'open',
        due_date: dueDateForSeverity(action.severity),
        created_by: userId,
        metadata: { generated_from: 'gap_analysis', article: finding.article },
      };
    });

    let taskIds: string[] = [];
    if (taskRows.length > 0) {
      const { data: tasks, error: tasksError } = await supabase
        .from('compliance_tasks')
        .insert(taskRows)
        .select('id');
      if (tasksError) throw tasksError;
      taskIds = (tasks ?? []).map((task) => task.id);
    }

    const audit = await createAuditEvent({
      organizationId,
      actorUserId: userId,
      action: 'gap_analysis.remediation_created',
      entityType: 'gap_assessment',
      entityId: body.assessmentId,
      metadata: { findingsCreated: insertedFindings.length, tasksCreated: taskIds.length },
    });
    if (!audit.persisted) throw new Error('gap_remediation_audit_unavailable');

    return { findingsCreated: insertedFindings.length, tasksCreated: taskIds.length };
  } catch (error) {
    const findingIds = insertedFindings.map((finding) => finding.id);
    if (findingIds.length > 0) {
      const { error: taskRollbackError } = await supabase
        .from('compliance_tasks')
        .delete()
        .eq('organization_id', organizationId)
        .in('finding_id', findingIds);
      if (taskRollbackError) {
        console.warn('[gap-analysis] task_compensation_failed', { code: taskRollbackError.code ?? 'unknown' });
      }

      const { error: findingRollbackError } = await supabase
        .from('compliance_findings')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .in('id', findingIds);
      if (findingRollbackError) {
        console.warn('[gap-analysis] finding_compensation_failed', { code: findingRollbackError.code ?? 'unknown' });
      }
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const access = await requireGapOrganizationPermission(user.id, 'read_ai_governance');
    if ('denied' in access) return access.denied;

    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'latest';

    if (view === 'history') {
      const requested = Number.parseInt(url.searchParams.get('limit') ?? '10', 10);
      const limit = Number.isFinite(requested) ? Math.max(1, Math.min(50, requested)) : 10;
      return noStoreJson({ assessments: await loadAssessmentHistory(access.organization.id, user.id, limit) });
    }

    if (view === 'work') {
      return noStoreJson(await loadOpenWork(access.organization.id, user.id));
    }

    if (view !== 'latest') {
      return noStoreJson({ error: 'unsupported_view' }, { status: 400 });
    }

    return noStoreJson({ assessment: await loadLatestAssessment(access.organization.id, user.id) });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const user = await requireApiUser();
    const access = await requireGapOrganizationPermission(user.id, 'manage_ai_governance');
    if ('denied' in access) return access.denied;

    const rateLimit = await checkDistributedRateLimit({
      key: `gap-analysis:${access.organization.id}:${user.id}`,
      policy: 'general-api',
      userId: user.id,
      organizationId: access.organization.id,
      route: '/api/gap-analysis',
      action: 'gap-analysis.write',
      limit: 20,
      windowMs: 60_000,
      failureMode: 'fail-closed',
    });

    if (!rateLimit.allowed) {
      return noStoreJson({ error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded' }, { status: rateLimit.reason ? 503 : 429 });
    }

    const operation = new URL(request.url).searchParams.get('operation') ?? 'assessment';
    if (operation === 'assessment') {
      const body = await parseJsonBodyWithZod(request, { schema: assessmentSchema, maxBytes: GAP_JSON_MAX_BYTES });
      const assessmentId = await saveAssessment(access.organization.id, user.id, body);
      return noStoreJson({ assessmentId }, { status: 201 });
    }

    if (operation === 'remediation') {
      const body = await parseJsonBodyWithZod(request, { schema: remediationSchema, maxBytes: GAP_JSON_MAX_BYTES });
      const result = await createRemediation(access.organization.id, user.id, body);
      return noStoreJson(result, { status: 201 });
    }

    return noStoreJson({ error: 'unsupported_operation' }, { status: 400 });
  } catch (error) {
    return secureApiError(error);
  }
}
