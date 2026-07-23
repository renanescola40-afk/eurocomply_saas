import { describe, expect, it } from 'vitest';
import { validateQualifiedReviewDecision } from './qualified-review-decision-controls';

const base = {
  currentStatus: 'submitted' as const,
  nextStatus: 'accepted' as const,
  actorId: 'approver-1',
  assignedBy: 'assigner-1',
  preparedBy: 'preparer-1',
  reviewerUserId: 'reviewer-1',
  hasCurrentValidSubmission: true,
  reason: 'Independent approval after evidence and scope review.',
};

describe('qualified review decision controls', () => {
  it('allows an independent approver with valid evidence', () => {
    expect(validateQualifiedReviewDecision(base)).toEqual({ allowed: true, failures: [] });
  });

  it.each([
    ['assigner-1', 'assigner cannot decide'],
    ['preparer-1', 'preparer cannot decide'],
    ['reviewer-1', 'reviewer cannot approve own review'],
  ])('blocks conflicted actor %s', (actorId, expected) => {
    const result = validateQualifiedReviewDecision({ ...base, actorId });
    expect(result.allowed).toBe(false);
    expect(result.failures).toContain(expected);
  });

  it('fails closed without a current valid submission', () => {
    const result = validateQualifiedReviewDecision({ ...base, hasCurrentValidSubmission: false });
    expect(result.allowed).toBe(false);
    expect(result.failures).toContain('valid submission is required');
  });

  it('requires a substantive decision reason', () => {
    const result = validateQualifiedReviewDecision({ ...base, reason: 'ok' });
    expect(result.allowed).toBe(false);
    expect(result.failures).toContain('decision reason is insufficient');
  });
});
