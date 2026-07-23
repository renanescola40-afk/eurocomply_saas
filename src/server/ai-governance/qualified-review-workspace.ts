export const QUALIFIED_REVIEW_REQUIREMENTS = [
  'legal-rules',
  'prohibited-practices',
  'article-50-copy',
  'fria-methodology',
  'deployer-obligations',
  'high-risk-provider',
  'conformity',
  'gpai',
] as const;

export type QualifiedReviewRequirement = typeof QUALIFIED_REVIEW_REQUIREMENTS[number];
export type QualifiedReviewStatus = 'DRAFT' | 'ASSIGNED' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'APPROVED_WITH_LIMITATIONS' | 'REJECTED' | 'EXPIRED';

export interface QualifiedReviewer {
  id: string;
  name: string;
  organization: string;
  contact: string;
  title: string;
  disciplines: string[];
  qualificationEvidence: string[];
  activeFrom: string;
  activeUntil: string;
}

export interface QualifiedReviewRecord {
  id: string;
  organizationId: string;
  requirementId: QualifiedReviewRequirement;
  reviewedSha: string;
  status: QualifiedReviewStatus;
  assignedReviewer?: QualifiedReviewer;
  assignedBy?: string;
  preparedBy: string;
  evidenceDigest?: string;
  evidenceReferences: string[];
  independenceStatement?: string;
  conflictChecked: boolean;
  conflictFound: boolean;
  decisionRationale?: string;
  limitations: string[];
  reviewedAt?: string;
  validUntil?: string;
  approvedBy?: string;
  version: number;
}

const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;

function date(value?: string): number {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function reviewerCanCover(reviewer: QualifiedReviewer, requirementScope: string, now = Date.now()): boolean {
  const active = date(reviewer.activeFrom) <= now && date(reviewer.activeUntil) >= now;
  const qualified = reviewer.qualificationEvidence.length > 0 && reviewer.disciplines.some((discipline) =>
    requirementScope.toLowerCase().includes(discipline.toLowerCase()),
  );
  return active && qualified;
}

export function validateQualifiedReview(record: QualifiedReviewRecord, now = Date.now()): string[] {
  const failures: string[] = [];
  if (!FULL_SHA.test(record.reviewedSha)) failures.push('reviewed_sha_invalid');
  if (!record.assignedReviewer) failures.push('reviewer_missing');
  if (!record.conflictChecked) failures.push('conflict_check_missing');
  if (record.conflictFound) failures.push('conflict_found');
  if ((record.independenceStatement ?? '').trim().length < 20) failures.push('independence_statement_missing');
  if (!DIGEST.test(record.evidenceDigest ?? '')) failures.push('evidence_digest_invalid');
  if (record.evidenceReferences.length === 0) failures.push('evidence_references_missing');
  if ((record.decisionRationale ?? '').trim().length < 30) failures.push('decision_rationale_missing');
  if (!record.reviewedAt || date(record.reviewedAt) > now) failures.push('reviewed_at_invalid');
  if (!record.validUntil || date(record.validUntil) <= now) failures.push('validity_expired');
  if (!record.approvedBy) failures.push('approver_missing');
  if (record.approvedBy === record.preparedBy) failures.push('preparer_approver_separation_required');
  if (record.assignedReviewer?.id === record.approvedBy) failures.push('reviewer_approver_separation_required');
  if (!['APPROVED', 'APPROVED_WITH_LIMITATIONS'].includes(record.status)) failures.push('terminal_approval_missing');
  if (record.status === 'APPROVED_WITH_LIMITATIONS' && record.limitations.length === 0) failures.push('limitations_required');
  return failures;
}

export function evaluateQualifiedReview(record: QualifiedReviewRecord, expectedSha: string, now = Date.now()) {
  const failures = validateQualifiedReview(record, now);
  if (record.reviewedSha !== expectedSha) failures.push('exact_sha_mismatch');
  return {
    accepted: failures.length === 0,
    failures,
    decision: failures.length === 0 ? 'QUALIFIED_REVIEW_ACCEPTED' : 'QUALIFIED_REVIEW_NO_GO',
  } as const;
}

export function transitionQualifiedReview(record: QualifiedReviewRecord, next: QualifiedReviewStatus, actorId: string): QualifiedReviewRecord {
  const allowed: Record<QualifiedReviewStatus, QualifiedReviewStatus[]> = {
    DRAFT: ['ASSIGNED'],
    ASSIGNED: ['IN_REVIEW', 'DRAFT'],
    IN_REVIEW: ['CHANGES_REQUESTED', 'APPROVED', 'APPROVED_WITH_LIMITATIONS', 'REJECTED'],
    CHANGES_REQUESTED: ['IN_REVIEW'],
    APPROVED: ['EXPIRED'],
    APPROVED_WITH_LIMITATIONS: ['EXPIRED'],
    REJECTED: ['DRAFT'],
    EXPIRED: ['DRAFT'],
  };
  if (!allowed[record.status].includes(next)) throw new Error(`invalid qualified review transition: ${record.status} -> ${next}`);
  if (['APPROVED', 'APPROVED_WITH_LIMITATIONS'].includes(next) && actorId === record.preparedBy) {
    throw new Error('preparer cannot approve qualified review');
  }
  return { ...record, status: next, approvedBy: ['APPROVED', 'APPROVED_WITH_LIMITATIONS'].includes(next) ? actorId : record.approvedBy, version: record.version + 1 };
}
