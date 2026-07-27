import { describe, expect, it } from 'vitest';

import { assertReviewerPortalSubmission } from './qualified-reviewer-portal-contract';

const now = new Date('2026-07-26T12:00:00.000Z');
const state = {
  sessionExpiresAt: '2026-07-26T18:00:00.000Z',
  assignmentStatus: 'in_review',
  reviewerActive: true,
  independenceConfirmed: true,
  scopeAcknowledged: true,
  campaignTargetSha: 'a'.repeat(40),
};
const input = {
  targetSha: 'a'.repeat(40),
  opinion: 'A'.repeat(100),
  evidenceLocations: ['evidence/review.json'],
  validUntil: '2026-08-26T12:00:00.000Z',
};

describe('qualified reviewer portal submission contract', () => {
  it('accepts an active independent exact-SHA reviewer submission', () => {
    expect(assertReviewerPortalSubmission(state, input, now)).toBe(true);
  });

  it('rejects expired sessions', () => {
    expect(() =>
      assertReviewerPortalSubmission({ ...state, sessionExpiresAt: now.toISOString() }, input, now),
    ).toThrow(/reviewer_session_expired/);
  });

  it('rejects missing attestation', () => {
    expect(() =>
      assertReviewerPortalSubmission({ ...state, independenceConfirmed: false }, input, now),
    ).toThrow(/reviewer_attestation_required/);
  });

  it('rejects cross-SHA submissions', () => {
    expect(() =>
      assertReviewerPortalSubmission(state, { ...input, targetSha: 'b'.repeat(40) }, now),
    ).toThrow(/reviewer_target_sha_mismatch/);
  });

  it('rejects terminal assignments', () => {
    expect(() =>
      assertReviewerPortalSubmission({ ...state, assignmentStatus: 'accepted' }, input, now),
    ).toThrow(/reviewer_assignment_closed/);
  });
});
