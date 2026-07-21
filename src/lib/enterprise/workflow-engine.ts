export type WorkflowStatus = 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type StepStatus = 'pending' | 'ready' | 'running' | 'waiting_approval' | 'approved' | 'rejected' | 'completed' | 'failed' | 'skipped' | 'expired';

export interface WorkflowStepDefinition {
  key: string;
  sequence: number;
  type: 'task' | 'approval' | 'notification' | 'webhook' | 'evidence' | 'decision' | 'delay';
  requiredApprovals: number;
  slaMinutes: number;
  escalationAfterMinutes?: number;
}

export interface WorkflowStepState {
  key: string;
  status: StepStatus;
  approvals: number;
  rejections: number;
  dueAt: string;
  attempts: number;
}

export interface WorkflowState {
  status: WorkflowStatus;
  startedAt: string;
  dueAt: string;
  currentStepKey?: string;
  steps: WorkflowStepState[];
}

export type WorkflowCommand =
  | { type: 'START'; at: string }
  | { type: 'COMPLETE_STEP'; stepKey: string; at: string }
  | { type: 'FAIL_STEP'; stepKey: string; at: string }
  | { type: 'APPROVE'; stepKey: string; at: string }
  | { type: 'REJECT'; stepKey: string; at: string }
  | { type: 'CANCEL'; at: string }
  | { type: 'TICK'; at: string };

const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

export function createWorkflowState(definitions: WorkflowStepDefinition[], startedAt: string, maxDurationMinutes: number): WorkflowState {
  if (!definitions.length) throw new Error('WORKFLOW_REQUIRES_STEPS');
  const sorted = [...definitions].sort((a, b) => a.sequence - b.sequence);
  if (new Set(sorted.map((step) => step.key)).size !== sorted.length) throw new Error('WORKFLOW_STEP_KEYS_MUST_BE_UNIQUE');
  return {
    status: 'pending',
    startedAt,
    dueAt: addMinutes(startedAt, maxDurationMinutes),
    steps: sorted.map((step, index) => ({
      key: step.key,
      status: index === 0 ? 'ready' : 'pending',
      approvals: 0,
      rejections: 0,
      dueAt: addMinutes(startedAt, step.slaMinutes),
      attempts: 0,
    })),
  };
}

export function transitionWorkflow(state: WorkflowState, definitions: WorkflowStepDefinition[], command: WorkflowCommand): WorkflowState {
  if (['completed', 'failed', 'cancelled', 'expired'].includes(state.status) && command.type !== 'TICK') {
    throw new Error('WORKFLOW_TERMINAL');
  }
  const next = structuredClone(state);
  const definitionByKey = new Map(definitions.map((step) => [step.key, step]));
  const findStep = (key: string) => {
    const step = next.steps.find((item) => item.key === key);
    if (!step) throw new Error('WORKFLOW_STEP_NOT_FOUND');
    return step;
  };
  const advance = (completedKey: string) => {
    const index = next.steps.findIndex((step) => step.key === completedKey);
    const following = next.steps[index + 1];
    if (!following) {
      next.status = 'completed';
      next.currentStepKey = undefined;
      return;
    }
    following.status = definitionByKey.get(following.key)?.type === 'approval' ? 'waiting_approval' : 'ready';
    next.currentStepKey = following.key;
    next.status = following.status === 'waiting_approval' ? 'waiting_approval' : 'running';
  };

  switch (command.type) {
    case 'START': {
      const first = next.steps[0];
      first.status = definitionByKey.get(first.key)?.type === 'approval' ? 'waiting_approval' : 'running';
      first.attempts += 1;
      next.currentStepKey = first.key;
      next.status = first.status === 'waiting_approval' ? 'waiting_approval' : 'running';
      return next;
    }
    case 'COMPLETE_STEP': {
      const step = findStep(command.stepKey);
      if (!['running', 'ready', 'approved'].includes(step.status)) throw new Error('WORKFLOW_STEP_NOT_COMPLETABLE');
      step.status = 'completed';
      advance(step.key);
      return next;
    }
    case 'FAIL_STEP': {
      const step = findStep(command.stepKey);
      step.status = 'failed';
      next.status = 'failed';
      return next;
    }
    case 'APPROVE': {
      const step = findStep(command.stepKey);
      const definition = definitionByKey.get(step.key);
      if (!definition || definition.type !== 'approval' || step.status !== 'waiting_approval') throw new Error('WORKFLOW_APPROVAL_NOT_ALLOWED');
      step.approvals += 1;
      if (step.approvals >= definition.requiredApprovals) {
        step.status = 'approved';
        advance(step.key);
      }
      return next;
    }
    case 'REJECT': {
      const step = findStep(command.stepKey);
      if (step.status !== 'waiting_approval') throw new Error('WORKFLOW_REJECTION_NOT_ALLOWED');
      step.rejections += 1;
      step.status = 'rejected';
      next.status = 'failed';
      return next;
    }
    case 'CANCEL':
      next.status = 'cancelled';
      return next;
    case 'TICK': {
      const now = new Date(command.at).getTime();
      if (now > new Date(next.dueAt).getTime()) {
        next.status = 'expired';
        return next;
      }
      for (const step of next.steps) {
        if (['ready', 'running', 'waiting_approval'].includes(step.status) && now > new Date(step.dueAt).getTime()) step.status = 'expired';
      }
      if (next.steps.some((step) => step.status === 'expired')) next.status = 'expired';
      return next;
    }
  }
}

export function shouldEscalate(step: WorkflowStepState, definition: WorkflowStepDefinition, now: string): boolean {
  if (!definition.escalationAfterMinutes || !['ready', 'running', 'waiting_approval'].includes(step.status)) return false;
  const escalationAt = new Date(step.dueAt).getTime() - (definition.slaMinutes - definition.escalationAfterMinutes) * 60_000;
  return new Date(now).getTime() >= escalationAt;
}
