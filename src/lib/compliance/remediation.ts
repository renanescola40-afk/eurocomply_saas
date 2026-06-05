import { supabase } from '@/integrations/supabase/client';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type ComplianceActionInput = {
  article: string;
  title?: string;
  recommendation: string;
  severity: 'critical' | 'medium';
};

export type CreateRemediationInput = {
  workspaceId: string;
  userId: string;
  assessmentId?: string | null;
  actions: ComplianceActionInput[];
};

export type RemediationResult =
  | { ok: true; findingsCreated: number; tasksCreated: number }
  | { ok: false; error: string; recoverable: boolean };

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown remediation error';
}

function isRecoverableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('compliance_findings') ||
    lower.includes('compliance_tasks') ||
    lower.includes('does not exist') ||
    lower.includes('schema cache') ||
    lower.includes('permission denied')
  );
}

function priorityFromSeverity(severity: ComplianceActionInput['severity']): TaskPriority {
  return severity === 'critical' ? 'critical' : 'medium';
}

function dueDateForSeverity(severity: ComplianceActionInput['severity']) {
  const days = severity === 'critical' ? 30 : 60;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildFindingTitle(action: ComplianceActionInput) {
  return action.title || `${action.article} compliance gap`;
}

export function buildTaskTitle(action: ComplianceActionInput) {
  return action.severity === 'critical'
    ? `Resolve critical gap: ${action.article}`
    : `Improve control: ${action.article}`;
}

export async function createFindingsAndTasks(input: CreateRemediationInput) {
  const actions = input.actions.filter((action) => action.recommendation.trim().length > 0);

  if (actions.length === 0) {
    return { findingsCreated: 0, tasksCreated: 0 };
  }

  const findingRows = actions.map((action) => ({
    workspace_id: input.workspaceId,
    assessment_id: input.assessmentId || null,
    user_id: input.userId,
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
    .select('id, article, recommendation, severity');

  if (findingsError) throw findingsError;

  const taskRows = (findings || []).map((finding, index) => {
    const action = actions[index];
    return {
      workspace_id: input.workspaceId,
      finding_id: finding.id,
      user_id: input.userId,
      title: buildTaskTitle(action),
      description: finding.recommendation || action.recommendation,
      priority: priorityFromSeverity(action.severity),
      status: 'open',
      due_date: dueDateForSeverity(action.severity),
      metadata: {
        generated_from: 'gap_analysis',
        article: finding.article,
      },
    };
  });

  if (taskRows.length > 0) {
    const { error: tasksError } = await supabase
      .from('compliance_tasks')
      .insert(taskRows);

    if (tasksError) throw tasksError;
  }

  return { findingsCreated: findings?.length || 0, tasksCreated: taskRows.length };
}

export async function tryCreateFindingsAndTasks(input: CreateRemediationInput): Promise<RemediationResult> {
  try {
    const result = await createFindingsAndTasks(input);
    return { ok: true, ...result };
  } catch (error) {
    const message = normalizeError(error);
    return {
      ok: false,
      error: message,
      recoverable: isRecoverableError(message),
    };
  }
}

export async function loadOpenComplianceWork(workspaceId: string) {
  const [{ data: findings, error: findingsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase
      .from('compliance_findings')
      .select('id, article, title, severity, status, due_date, created_at')
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }),
    supabase
      .from('compliance_tasks')
      .select('id, title, priority, status, due_date, created_at')
      .eq('workspace_id', workspaceId)
      .in('status', ['open', 'in_progress', 'blocked'])
      .order('created_at', { ascending: false }),
  ]);

  if (findingsError) throw findingsError;
  if (tasksError) throw tasksError;

  return {
    findings: findings || [],
    tasks: tasks || [],
  };
}

export async function tryLoadOpenComplianceWork(workspaceId: string) {
  try {
    return await loadOpenComplianceWork(workspaceId);
  } catch {
    return { findings: [], tasks: [] };
  }
}
