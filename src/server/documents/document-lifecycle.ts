export const DOCUMENT_STATES = ['draft','in_review','changes_required','approved','published','superseded','archived'] as const;
export type DocumentState = (typeof DOCUMENT_STATES)[number];

const transitions: Record<DocumentState, DocumentState[]> = {
  draft: ['in_review','archived'],
  in_review: ['changes_required','approved','archived'],
  changes_required: ['in_review','archived'],
  approved: ['published','superseded','archived'],
  published: ['superseded','archived'],
  superseded: ['archived'],
  archived: [],
};

export type DocumentLifecycleInput = {
  currentState: DocumentState;
  nextState: DocumentState;
  ownerId: string;
  actorId: string;
  approverId?: string | null;
  reviewDecision?: 'approved' | 'changes_required' | 'rejected' | null;
  digestSha256?: string | null;
  storagePath?: string | null;
};

export function evaluateDocumentTransition(input: DocumentLifecycleInput) {
  const reasons: string[] = [];
  if (!transitions[input.currentState].includes(input.nextState)) reasons.push('transition_not_allowed');
  if (input.nextState === 'approved') {
    if (!input.approverId) reasons.push('approver_required');
    if (input.approverId === input.ownerId) reasons.push('separation_of_duties_required');
    if (input.reviewDecision !== 'approved') reasons.push('approved_review_required');
  }
  if (input.nextState === 'published') {
    if (!input.digestSha256 || !/^[0-9a-f]{64}$/.test(input.digestSha256)) reasons.push('valid_digest_required');
    if (!input.storagePath || input.storagePath.trim().length < 3) reasons.push('storage_path_required');
  }
  return {
    allowed: reasons.length === 0,
    reasons,
    requiresAuditEvent: input.currentState !== input.nextState,
    productionVisible: input.nextState === 'published' && reasons.length === 0,
  };
}

export function buildExecutiveEvidenceSummary(input: {
  totalDocuments: number;
  approvedDocuments: number;
  publishedDocuments: number;
  overdueReviews: number;
  failedExports: number;
}) {
  const complete = input.totalDocuments > 0 && input.approvedDocuments + input.publishedDocuments === input.totalDocuments;
  return {
    ...input,
    approvalCoveragePercent: input.totalDocuments === 0 ? 0 : Math.round(((input.approvedDocuments + input.publishedDocuments) / input.totalDocuments) * 100),
    releaseReady: complete && input.overdueReviews === 0 && input.failedExports === 0,
    evidenceBoundary: 'Repository-derived decision support only; it does not establish legal sufficiency, certification or external assurance.',
  };
}