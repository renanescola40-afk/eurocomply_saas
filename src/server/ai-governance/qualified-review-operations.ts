import { createHash } from 'node:crypto';

export const QUALIFIED_REVIEW_WORKSTREAMS = {
  'LEGAL-RULES': 4,
  'PROHIBITED-PRACTICES': 7,
  'ARTICLE-50': 8,
  FRIA: 6,
  DEPLOYER: 7,
  'HIGH-RISK-PROVIDER': 9,
  CONFORMITY: 5,
  GPAI: 5,
} as const;

export type QualifiedReviewWorkstream = keyof typeof QUALIFIED_REVIEW_WORKSTREAMS;
export type AssignmentStatus = 'assigned' | 'in_review' | 'changes_requested' | 'submitted' | 'accepted' | 'rejected' | 'expired' | 'revoked';

export interface ReviewerAssurance {
  reviewerId: string;
  qualificationSummary: string;
  qualificationEvidenceCount: number;
  independenceDeclared: boolean;
  conflictDetails?: string | null;
  verifiedAt?: string | null;
}

export interface ReviewSubmissionInput {
  assignmentId: string;
  workstreamId: QualifiedReviewWorkstream;
  targetSha: string;
  reviewer: ReviewerAssurance;
  opinion: string;
  conclusion: 'accepted' | 'accepted_with_conditions' | 'changes_required' | 'rejected';
  scope: string[];
  evidenceLocations: string[];
  limitations: string[];
  submittedAt: string;
  validUntil: string;
}

export interface ReviewValidationResult {
  accepted: boolean;
  integritySha256: string;
  failures: string[];
  weightedCompletion: number;
  normalizedStatus: AssignmentStatus;
}

const FULL_SHA = /^[a-f0-9]{40}$/;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function reviewIntegrityDigest(input: ReviewSubmissionInput): string {
  return createHash('sha256').update(stable(input)).digest('hex');
}

export function validateQualifiedReviewSubmission(
  input: ReviewSubmissionInput,
  { expectedSha, now = new Date() }: { expectedSha: string; now?: Date },
): ReviewValidationResult {
  const failures: string[] = [];
  const expectedWeight = QUALIFIED_REVIEW_WORKSTREAMS[input.workstreamId];
  if (!FULL_SHA.test(expectedSha) || input.targetSha !== expectedSha) failures.push('target SHA mismatch');
  if (!input.reviewer.reviewerId.trim()) failures.push('reviewer identity missing');
  if (input.reviewer.qualificationSummary.trim().length < 40) failures.push('qualification summary is insufficient');
  if (input.reviewer.qualificationEvidenceCount < 1) failures.push('qualification evidence is missing');
  if (!input.reviewer.verifiedAt) failures.push('reviewer qualification is not verified');
  if (!input.reviewer.independenceDeclared) failures.push('independence declaration is missing');
  if (input.reviewer.conflictDetails?.trim()) failures.push('declared conflict requires reassignment');
  if (input.opinion.trim().length < 40) failures.push('review opinion is not substantive');
  if (input.scope.length === 0) failures.push('review scope is empty');
  if (input.evidenceLocations.length === 0) failures.push('review evidence locations are empty');
  const submittedAt = new Date(input.submittedAt);
  const validUntil = new Date(input.validUntil);
  if (Number.isNaN(submittedAt.valueOf()) || Number.isNaN(validUntil.valueOf())) failures.push('review dates are invalid');
  if (validUntil <= submittedAt) failures.push('review validity window is invalid');
  if (validUntil <= now) failures.push('review is expired');
  const positiveConclusion = input.conclusion === 'accepted' || input.conclusion === 'accepted_with_conditions';
  if (!positiveConclusion) failures.push('review conclusion is not acceptable for closure');
  const accepted = failures.length === 0;
  return {
    accepted,
    integritySha256: reviewIntegrityDigest(input),
    failures,
    weightedCompletion: accepted ? expectedWeight : 0,
    normalizedStatus: accepted ? 'accepted' : input.conclusion === 'changes_required' ? 'changes_requested' : 'rejected',
  };
}

export function calculateQualifiedReviewProgress(
  decisions: Array<{ workstreamId: QualifiedReviewWorkstream; accepted: boolean; validUntil: string }>,
  now = new Date(),
) {
  const accepted = new Set<QualifiedReviewWorkstream>();
  for (const decision of decisions) {
    if (decision.accepted && new Date(decision.validUntil) > now) accepted.add(decision.workstreamId);
  }
  const completedWeight = [...accepted].reduce((sum, id) => sum + QUALIFIED_REVIEW_WORKSTREAMS[id], 0);
  const totalWeight = Object.values(QUALIFIED_REVIEW_WORKSTREAMS).reduce((sum, weight) => sum + weight, 0);
  return {
    completedWeight,
    remainingWeight: totalWeight - completedWeight,
    acceptedWorkstreams: [...accepted].sort(),
    remainingWorkstreams: (Object.keys(QUALIFIED_REVIEW_WORKSTREAMS) as QualifiedReviewWorkstream[])
      .filter((id) => !accepted.has(id))
      .sort((a, b) => QUALIFIED_REVIEW_WORKSTREAMS[b] - QUALIFIED_REVIEW_WORKSTREAMS[a]),
    readyForStrictCloseout: completedWeight === totalWeight,
  };
}

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  const transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
    assigned: ['in_review', 'revoked'],
    in_review: ['submitted', 'revoked'],
    submitted: ['accepted', 'changes_requested', 'rejected', 'expired'],
    changes_requested: ['in_review', 'revoked'],
    accepted: ['expired', 'revoked'],
    rejected: ['in_review', 'revoked'],
    expired: ['in_review', 'revoked'],
    revoked: [],
  };
  return transitions[from].includes(to);
}
