import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePersistentExecutionState } from '../../scripts/enterprise/check-persistent-execution-state.mjs';

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);

function state(overrides = {}) {
  return {
    observed_main_sha: HEAD,
    last_verified_score_sha: OLD,
    controls_total: 100,
    current_decision: 'NO_GO',
    evidence_freshness: { status: 'STALE' },
    ...overrides,
  };
}

test('accepts an explicitly stale historical score', () => {
  assert.deepEqual(validatePersistentExecutionState(state(), HEAD), []);
});

test('rejects a historical score represented as fresh', () => {
  assert.ok(validatePersistentExecutionState(state({
    evidence_freshness: { status: 'FRESH_EXACT_SHA' },
  }), HEAD).includes('fresh_score_must_match_checked_out_sha'));
});

test('rejects GO without an exact-SHA score', () => {
  assert.ok(validatePersistentExecutionState(state({ current_decision: 'GO' }), HEAD)
    .includes('go_requires_fresh_exact_sha_score'));
});
