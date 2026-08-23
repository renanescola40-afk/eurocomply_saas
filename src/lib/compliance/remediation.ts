export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type ComplianceActionInput = {
  article: string;
  title?: string;
  recommendation: string;
  severity: 'critical' | 'medium';
};

export type CreateRemediationInput = {
  workspaceId?: string | null;
  userId: string;
  assessmentId?: string | null;
  actions: ComplianceActionInput[];
};

export type RemediationResult =
  | { ok: true; findingsCreated: number; tasksCreated: number }
  | { ok: false; error: string; recoverable: boolean };

type ComplianceWork = {
  findings: Array<{
    id: string;
    article: string | null;
    title: string;
    severity: string;
    status: string;
    due_date?: string | null;
    created_at?: string | null;
  }>;
  tasks: Array<{
    id: string;
    finding_id?: string | null;
    title: string;
    priority: string;
    status: string;
    due_date?: string | null;
    created_at?: string | null;
  }>;
};

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
    lower.includes('permission') ||
    lower.includes('commercial') ||
    lower.includes('payment')
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

async function remediationApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let error = `Compliance remediation request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) error = body.error;
    } catch {
      // Keep the generic fail-closed error without exposing response bytes.
    }
    throw new Error(error);
  }

  return await response.json() as T;
}

/**
 * Remediation creation is intentionally server-mediated. Identity and tenant are
 * derived from the authenticated request; caller supplied user/workspace values
 * are compatibility metadata and never authorization inputs.
 */
export async function createFindingsAndTasks(input: CreateRemediationInput) {
  if (!input.assessmentId) throw new Error('A persisted assessment is required for remediation.');
  if (input.actions.length === 0) return { findingsCreated: 0, tasksCreated: 0 };

  return await remediationApi<{ findingsCreated: number; tasksCreated: number }>(
    '/api/gap-analysis?operation=remediation',
    {
      method: 'POST',
      body: JSON.stringify({ assessmentId: input.assessmentId, actions: input.actions }),
    },
  );
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

export async function loadOpenComplianceWork(_params: { workspaceId?: string | null; userId?: string | null }) {
  return await remediationApi<ComplianceWork>('/api/gap-analysis?view=work');
}

export async function tryLoadOpenComplianceWork(params: { workspaceId?: string | null; userId?: string | null }) {
  try {
    return await loadOpenComplianceWork(params);
  } catch {
    return { findings: [], tasks: [] } as ComplianceWork;
  }
}

// Retain these pure helpers for report/tests that rely on deterministic labels.
export const remediationPriorityFromSeverity = priorityFromSeverity;
export const remediationDueDateForSeverity = dueDateForSeverity;
