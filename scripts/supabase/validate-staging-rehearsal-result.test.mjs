import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { validateStagingRehearsalResult } from './validate-staging-rehearsal-result.mjs';

const sha = 'a'.repeat(40);
const plan = {
  schema: 'risck-comply.supabase-staging-rehearsal-plan.v2',
  releaseSha: sha,
  targetSha: sha,
  batches: [{ batch: 1 }],
};
const planRaw = JSON.stringify(plan);
const planDigest = createHash('sha256').update(planRaw).digest('hex');
const result = {
  schema: 'risck-comply.supabase-staging-rehearsal-result.v2',
  releaseSha: sha,
  planDigest,
  stagingProjectRef: 'staging-project',
  productionProjectRef: 'production-project',
  operator: 'operator@example.com',
  approver: 'approver@example.com',
  status: 'Complete',
  outcome: 'passed',
  startedAt: '2026-08-09T09:00:00.000Z',
  completedAt: '2026-08-09T09:10:00.000Z',
  batches: [{
    batch: 1,
    outcome: 'passed',
    migrationHistoryEvidence: 'artifact://history/1',
    schemaDiffEvidence: 'artifact://schema/1',
    rlsEvidence: 'artifact://rls/1',
    smokeEvidence: 'artifact://smoke/1',
    rollbackEvidence: 'artifact://rollback/1',
  }],
};

test('accepts exact plan-bound staging evidence and remains non-authorizing', () => {
  const resultRaw = JSON.stringify(result);
  const attestation = validateStagingRehearsalResult({ plan, planRaw, result, resultRaw, expectedSha: sha });
  assert.equal(attestation.status, 'STAGING_REHEARSAL_PASSED');
  assert.equal(attestation.releaseSha, sha);
  assert.equal(attestation.safety.productionPushAuthorized, false);
});

test('rejects a copied result bound to another plan digest', () => {
  assert.throws(() => validateStagingRehearsalResult({
    plan,
    planRaw,
    result: { ...result, planDigest: 'b'.repeat(64) },
    resultRaw: JSON.stringify(result),
    expectedSha: sha,
  }), /exact plan digest/);
});

test('rejects staging that aliases production or lacks independent approval', () => {
  assert.throws(() => validateStagingRehearsalResult({
    plan,
    planRaw,
    result: { ...result, stagingProjectRef: 'same', productionProjectRef: 'same' },
    resultRaw: JSON.stringify(result),
    expectedSha: sha,
  }), /must differ/);
  assert.throws(() => validateStagingRehearsalResult({
    plan,
    planRaw,
    result: { ...result, operator: 'same@example.com', approver: 'same@example.com' },
    resultRaw: JSON.stringify(result),
    expectedSha: sha,
  }), /must be different/);
});
