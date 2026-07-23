import type { AssignmentStatus } from './qualified-review-operations';

export interface QualifiedReviewDecisionContext {
  currentStatus: AssignmentStatus;
  nextStatus: AssignmentStatus;
  actorId: string;
  assignedBy: string;
  preparedBy?: string | null;
  reviewerUserId?: string | null;
  hasCurrentValidSubmission: boolean;
  reason?: string | null;
}

export interface QualifiedReviewDecisionResult {
  allowed: boolean;
  failures: string[];
}

const DECISION_STATUSES = new Set<AssignmentStatus>(['accepted', 'rejected', 'changes_requested']);

export function validateQualifiedReviewDecision(context: QualifiedReviewDecisionContext): QualifiedReviewDecisionResult {
  const failures: string[] = [];
  const isDecision = DECISION_STATUSES.has(context.nextStatus);

  if (!context.actorId.trim()) failures.push('actor identity missing');

  if (isDecision) {
    if (context.actorId === context.assignedBy) failures.push('assigner cannot decide');
    if (context.preparedBy && context.actorId === context.preparedBy) failures.push('preparer cannot decide');
    if (context.reviewerUserId && context.actorId === context.reviewerUserId) failures.push('reviewer cannot approve own review');
    if ((context.reason?.trim().length ?? 0) < 20) failures.push('decision reason is insufficient');
  }

  if (context.nextStatus === 'accepted' && !context.hasCurrentValidSubmission) {
    failures.push('valid submission is required');
  }

  return { allowed: failures.length === 0, failures };
}
