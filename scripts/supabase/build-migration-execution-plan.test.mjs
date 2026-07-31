import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExecutionPlan } from './build-migration-execution-plan.mjs';

const sha = 'a'.repeat(40);
const digest = 'b'.repeat(64);
const base = {
  decisionResult: {
    schema: 'risck-comply.supabase-migration-reconciliation-decision-result.v1',
    accepted: true,
    decisionStatus: 'RECONCILIATION_ACCEPTED',
    releaseSha: sha,
    inventorySha256: digest,
  },
  pendingPlan: {
    releaseSha: sha,
    inventorySha256: digest,
    items: [{
      filename: '20260101000000_example.sql',
      sha256: digest,
      version: '20260101000000',
      deployOrderDecision: 1,
      stagedExecutionEvidenceReference: 'artifact://staging/1',
      rollbackReference: 'runbook://rollback/1',
    }],
  },
  repairPlan: { releaseSha: sha, inventorySha256: digest, items: [] },
};

test('produces bounded non-authorizing batches', () => {
  const result = buildExecutionPlan(base);
  assert.equal(result.accepted, true);
  assert.equal(result.batches.length, 1);
  assert.equal(result.batches[0].executionAuthorized, false);
  assert.equal(result.safety.productionWriteAuthorized, false);
});

test('rejects unaccepted reconciliation decisions', () => {
  const result = buildExecutionPlan({
    ...base,
    decisionResult: { ...base.decisionResult, accepted: false },
  });
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('reconciliation_not_accepted'));
});

test('rejects duplicate deployment order', () => {
  const duplicate = { ...base.pendingPlan.items[0], filename: '20260102000000_other.sql' };
  const result = buildExecutionPlan({
    ...base,
    pendingPlan: { ...base.pendingPlan, items: [...base.pendingPlan.items, duplicate] },
  });
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('duplicate_order:1'));
});

test('requires staging and rollback evidence', () => {
  const item = { ...base.pendingPlan.items[0], stagedExecutionEvidenceReference: null, rollbackReference: null };
  const result = buildExecutionPlan({ ...base, pendingPlan: { ...base.pendingPlan, items: [item] } });
  assert.equal(result.accepted, false);
  assert.ok(result.failures.some((failure) => failure.startsWith('missing_staging_evidence:')));
  assert.ok(result.failures.some((failure) => failure.startsWith('missing_rollback_reference:')));
});
