import test from 'node:test';
import assert from 'node:assert/strict';
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

test('accepts an active independent exact-SHA reviewer submission', () => {
  assert.equal(assertReviewerPortalSubmission(state, input, now), true);
});

test('rejects expired sessions', () => {
  assert.throws(() => assertReviewerPortalSubmission({ ...state, sessionExpiresAt: now.toISOString() }, input, now), /reviewer_session_expired/);
});

test('rejects missing attestation', () => {
  assert.throws(() => assertReviewerPortalSubmission({ ...state, independenceConfirmed: false }, input, now), /reviewer_attestation_required/);
});

test('rejects cross-SHA submissions', () => {
  assert.throws(() => assertReviewerPortalSubmission(state, { ...input, targetSha: 'b'.repeat(40) }, now), /reviewer_target_sha_mismatch/);
});

test('rejects terminal assignments', () => {
  assert.throws(() => assertReviewerPortalSubmission({ ...state, assignmentStatus: 'accepted' }, input, now), /reviewer_assignment_closed/);
});
