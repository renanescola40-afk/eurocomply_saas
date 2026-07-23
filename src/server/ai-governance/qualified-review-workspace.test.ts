import { describe, expect, it } from 'vitest';
import { evaluateQualifiedReview, transitionQualifiedReview, type QualifiedReviewRecord } from './qualified-review-workspace';

const SHA = 'a'.repeat(40);
const base: QualifiedReviewRecord = {
  id: 'review-1', organizationId: 'org-1', requirementId: 'legal-rules', reviewedSha: SHA,
  status: 'IN_REVIEW', preparedBy: 'preparer', assignedBy: 'admin', evidenceReferences: ['artifact://legal-rules'],
  assignedReviewer: { id: 'reviewer', name: 'Qualified Reviewer', organization: 'Independent Ltd', contact: 'reviewer@example.com', title: 'EU AI Counsel', disciplines: ['legal rules'], qualificationEvidence: ['roster://reviewer'], activeFrom: '2026-01-01', activeUntil: '2027-01-01' },
  evidenceDigest: `sha256:${'b'.repeat(64)}`, independenceStatement: 'No financial, personal or delivery conflict was identified.',
  conflictChecked: true, conflictFound: false, decisionRationale: 'The reviewed materials are consistent with the defined legal-rule scope.',
  limitations: [], reviewedAt: '2026-07-23T10:00:00.000Z', validUntil: '2027-01-01T00:00:00.000Z', approvedBy: 'approver', version: 2,
};

describe('qualified review workspace', () => {
  it('accepts a complete exact-SHA independent approval', () => {
    const result = evaluateQualifiedReview({ ...base, status: 'APPROVED' }, SHA, Date.parse('2026-07-24T00:00:00Z'));
    expect(result.accepted).toBe(true);
  });

  it('rejects stale SHA, conflict, expired validity and same-person approval', () => {
    const result = evaluateQualifiedReview({ ...base, status: 'APPROVED', reviewedSha: 'c'.repeat(40), conflictFound: true, validUntil: '2026-01-01T00:00:00Z', approvedBy: 'preparer' }, SHA, Date.parse('2026-07-24T00:00:00Z'));
    expect(result.accepted).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining(['exact_sha_mismatch', 'conflict_found', 'validity_expired', 'preparer_approver_separation_required']));
  });

  it('enforces lifecycle and separation of duties', () => {
    expect(() => transitionQualifiedReview(base, 'APPROVED', 'preparer')).toThrow(/preparer/);
    expect(transitionQualifiedReview(base, 'APPROVED_WITH_LIMITATIONS', 'approver').version).toBe(3);
    expect(() => transitionQualifiedReview({ ...base, status: 'DRAFT' }, 'APPROVED', 'approver')).toThrow(/invalid/);
  });
});
