import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectEvidenceShaBindings,
  resolveEvidenceShaBinding,
} from '../../scripts/release/evidence-sha-binding.mjs';

const TARGET = 'a'.repeat(40);
const STALE = 'b'.repeat(40);

test('recognizes canonical nested runtimeContext commit SHA', () => {
  const resolved = resolveEvidenceShaBinding({
    status: 'Complete',
    runtimeContext: { commitSha: TARGET },
  });

  assert.equal(resolved.sha, TARGET);
  assert.equal(resolved.source, 'runtimeContext.commitSha');
  assert.equal(resolved.conflict, false);
});

test('keeps top-level binding precedence for backwards compatibility', () => {
  const resolved = resolveEvidenceShaBinding({
    targetSha: TARGET,
    runtimeContext: { commitSha: TARGET },
  });

  assert.equal(resolved.sha, TARGET);
  assert.equal(resolved.source, 'targetSha');
  assert.equal(resolved.conflict, false);
});

test('detects conflicting valid SHA bindings instead of silently choosing one', () => {
  const resolved = resolveEvidenceShaBinding({
    targetSha: TARGET,
    runtimeContext: { commitSha: STALE },
  });

  assert.equal(resolved.sha, TARGET);
  assert.equal(resolved.conflict, true);
  assert.deepEqual(resolved.distinctValidShas.sort(), [TARGET, STALE].sort());
});

test('collects only explicit known SHA provenance bindings', () => {
  const bindings = collectEvidenceShaBindings({
    runtimeContext: { commitSha: TARGET },
    arbitrary: { sha: STALE },
    verification_provenance: { commitSha: TARGET },
  });

  assert.deepEqual(bindings.map((binding) => binding.source), [
    'runtimeContext.commitSha',
    'verification_provenance.commitSha',
  ]);
});
