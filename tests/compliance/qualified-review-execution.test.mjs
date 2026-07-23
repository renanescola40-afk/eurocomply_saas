import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReviewPackets } from '../../scripts/compliance/build-qualified-review-packets.mjs';
import { validateSignoff } from '../../scripts/compliance/validate-qualified-review-signoffs.mjs';

const targetSha = 'a'.repeat(40);
const requirement = { id: 'legal-rules', weight: 4, acceptedPath: 'accepted.json', questions: ['Question one?', 'Question two?', 'Question three?'] };

test('builds exact-SHA immutable review packets', () => {
  const packets = buildReviewPackets({ registry: { requirements: [requirement] }, targetSha, generatedAt: '2026-07-23T00:00:00.000Z' });
  assert.equal(packets.length, 1);
  assert.equal(packets[0].targetSha, targetSha);
  assert.match(packets[0].integrity.sha256, /^[a-f0-9]{64}$/);
});

test('fails closed on conflicted, incomplete or cross-SHA signoff', () => {
  const failures = validateSignoff({
    schema: 'risck-comply.qualified-review-signoff.v1',
    repository: 'renanescola40-afk/eurocomply_saas',
    targetSha: 'b'.repeat(40),
    requirementId: 'legal-rules',
    reviewer: { name: '', organization: '', qualification: '', emailHash: '' },
    independence: { conflictFree: false, notAuthor: false, notApprover: false, statement: '' },
    reviewedAt: '2026-07-23T00:00:00.000Z',
    expiresAt: '2026-07-24T00:00:00.000Z',
    answers: [],
    conclusion: 'REJECTED',
    integrity: { evidenceBundleSha256: '', signoffSha256: '' }
  }, requirement, { targetSha, now: new Date('2026-07-23T12:00:00.000Z') });
  assert.ok(failures.includes('target_sha_mismatch'));
  assert.ok(failures.includes('independence_failed'));
  assert.ok(failures.includes('review_answers_incomplete'));
  assert.ok(failures.includes('conclusion_not_accepted'));
});
