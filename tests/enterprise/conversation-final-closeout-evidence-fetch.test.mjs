import assert from 'node:assert/strict';
import test from 'node:test';

import {
  selectExactArtifact,
  selectExactShaRun,
} from '../../scripts/enterprise/fetch-conversation-final-closeout-evidence.mjs';

const SHA = 'a'.repeat(40);

test('selects the newest successful exact-main-SHA workflow run', () => {
  const selected = selectExactShaRun([
    { id: 1, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T10:00:00Z' },
    { id: 2, head_sha: 'b'.repeat(40), head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T11:00:00Z' },
    { id: 3, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-07-29T12:00:00Z' },
    { id: 4, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T13:00:00Z' },
    { id: 5, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T14:00:00Z' },
  ], SHA);

  assert.equal(selected.id, 5);
});

test('rejects expired or differently named artifacts', () => {
  const expected = `enterprise-readiness-scorecard-${SHA}`;
  assert.equal(selectExactArtifact([
    { id: 1, name: expected, expired: true, updated_at: '2026-07-29T14:00:00Z' },
    { id: 2, name: `enterprise-readiness-scorecard-${'b'.repeat(40)}`, expired: false, updated_at: '2026-07-29T15:00:00Z' },
  ], expected), null);
});

test('selects the newest retained exact-name artifact', () => {
  const expected = `enterprise-production-final-evidence-${SHA}`;
  const selected = selectExactArtifact([
    { id: 1, name: expected, expired: false, updated_at: '2026-07-29T13:00:00Z' },
    { id: 2, name: expected, expired: false, updated_at: '2026-07-29T14:00:00Z' },
  ], expected);

  assert.equal(selected.id, 2);
});
