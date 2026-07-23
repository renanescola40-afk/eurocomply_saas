import { describe, expect, it } from 'vitest';
import { QUALIFIED_REVIEW_WORKSTREAMS, calculateQualifiedReviewProgress, canTransitionAssignment, validateQualifiedReviewSubmission } from './qualified-review-operations';

const sha = 'a'.repeat(40);
const validSubmission = {
  assignmentId: 'assignment-1', workstreamId: 'HIGH-RISK-PROVIDER' as const, targetSha: sha,
  reviewer: { reviewerId: 'reviewer-1', qualificationSummary: 'Independent EU AI governance lawyer with documented high-risk provider methodology experience.', qualificationEvidenceCount: 2, independenceDeclared: true, conflictDetails: null, verifiedAt: '2026-07-23T00:00:00.000Z' },
  opinion: 'The reviewed methodology is internally coherent, evidence-linked and suitable for the stated readiness scope.',
  conclusion: 'accepted' as const, scope: ['Article 9', 'Article 10'], evidenceLocations: ['docs/compliance/HIGH_RISK_PROVIDER_DATA_GOVERNANCE.md'],
  limitations: ['This is not certification or regulator approval.'], submittedAt: '2026-07-23T01:00:00.000Z', validUntil: '2027-07-23T01:00:00.000Z',
};

describe('qualified review operations', () => {
  it('accepts a complete independent exact-SHA review package', () => {
    const result = validateQualifiedReviewSubmission(validSubmission, { expectedSha: sha, now: new Date('2026-07-24T00:00:00.000Z') });
    expect(result.accepted).toBe(true); expect(result.weightedCompletion).toBe(9); expect(result.integritySha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('fails closed on conflict, wrong SHA, expiry and weak evidence', () => {
    const result = validateQualifiedReviewSubmission({ ...validSubmission, targetSha: 'b'.repeat(40), opinion: 'too short', reviewer: { ...validSubmission.reviewer, conflictDetails: 'Previously authored the reviewed methodology.' }, validUntil: '2026-07-23T01:30:00.000Z' }, { expectedSha: sha, now: new Date('2026-07-24T00:00:00.000Z') });
    expect(result.accepted).toBe(false); expect(result.weightedCompletion).toBe(0);
    expect(result.failures).toEqual(expect.arrayContaining(['target SHA mismatch','declared conflict requires reassignment','review opinion is not substantive','review is expired']));
  });
  it('preserves the 51-point human review boundary', () => {
    expect(Object.values(QUALIFIED_REVIEW_WORKSTREAMS).reduce((sum, weight) => sum + weight, 0)).toBe(51);
    const progress = calculateQualifiedReviewProgress([{ workstreamId: 'ARTICLE-50', accepted: true, validUntil: '2027-01-01T00:00:00.000Z' }], new Date('2026-01-01T00:00:00.000Z'));
    expect(progress.completedWeight).toBe(8); expect(progress.remainingWeight).toBe(43); expect(progress.readyForStrictCloseout).toBe(false);
  });
  it('enforces lifecycle transitions', () => {
    expect(canTransitionAssignment('assigned','in_review')).toBe(true); expect(canTransitionAssignment('assigned','accepted')).toBe(false); expect(canTransitionAssignment('submitted','accepted')).toBe(true);
  });
});
