export type ReviewerPortalState = {
  sessionExpiresAt: string;
  assignmentStatus: string;
  reviewerActive: boolean;
  independenceConfirmed: boolean;
  scopeAcknowledged: boolean;
  campaignTargetSha: string;
};

export type ReviewerSubmissionInput = {
  targetSha: string;
  opinion: string;
  evidenceLocations: string[];
  validUntil: string;
};

const CLOSED = new Set(['accepted', 'rejected', 'expired', 'revoked']);

export function assertReviewerPortalSubmission(state: ReviewerPortalState, input: ReviewerSubmissionInput, now = new Date()) {
  if (new Date(state.sessionExpiresAt) <= now) throw new Error('reviewer_session_expired');
  if (!state.reviewerActive) throw new Error('reviewer_inactive');
  if (CLOSED.has(state.assignmentStatus)) throw new Error('reviewer_assignment_closed');
  if (!state.independenceConfirmed || !state.scopeAcknowledged) throw new Error('reviewer_attestation_required');
  if (!/^[a-f0-9]{40}$/.test(input.targetSha) || input.targetSha !== state.campaignTargetSha) throw new Error('reviewer_target_sha_mismatch');
  if (input.opinion.trim().length < 80) throw new Error('reviewer_opinion_too_short');
  if (input.evidenceLocations.length === 0) throw new Error('reviewer_evidence_required');
  if (new Date(input.validUntil) <= now) throw new Error('reviewer_validity_invalid');
  return true;
}
