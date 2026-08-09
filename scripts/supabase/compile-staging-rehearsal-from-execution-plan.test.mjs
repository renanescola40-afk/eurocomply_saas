import assert from 'node:assert/strict';
import test from 'node:test';

import { compileStagingRehearsalPlan } from './compile-staging-rehearsal-from-execution-plan.mjs';

const releaseSha = 'a'.repeat(40);
const migrationDigest = 'b'.repeat(64);
const executionPlan = {
  schema: 'risck-comply.supabase-migration-execution-plan.v1',
  accepted: true,
  releaseSha,
  status: 'PLANNING_COMPLETE_AWAITING_STAGING_REHEARSAL',
  batches: [{
    batchId: 'batch-001',
    executionAuthorized: false,
    items: [{
      filename: '20260101000000_pending.sql',
      version: '20260101000000',
      sha256: migrationDigest,
      deployOrderDecision: 1,
      schemaEvidenceReference: 'artifact://schema/absent',
      rollbackReference: 'runbook://rollback/1',
    }],
  }],
  historyRepairCandidates: [],
  safety: { productionWriteAuthorized: false },
};
const bytes = Buffer.from(JSON.stringify(executionPlan));

test('compiles an explicitly non-authorizing staging plan', () => {
  const plan = compileStagingRehearsalPlan({ executionPlan, executionPlanBytes: bytes, expectedSha: releaseSha });
  assert.equal(plan.failures, undefined);
  assert.equal(plan.releaseSha, releaseSha);
  assert.equal(plan.targetSha, releaseSha);
  assert.equal(plan.status, 'AWAITING_STAGING_EXECUTION');
  assert.equal(plan.batches.length, 1);
  assert.equal(plan.batches[0].executionAuthorized, false);
  assert.equal(plan.safety.productionWritePerformed, false);
});

test('rejects an execution plan bound to another release', () => {
  const plan = compileStagingRehearsalPlan({
    executionPlan: { ...executionPlan, releaseSha: 'c'.repeat(40) },
    executionPlanBytes: bytes,
    expectedSha: releaseSha,
  });
  assert.equal(plan.accepted, false);
  assert.ok(plan.failures.includes('execution_plan_release_sha_mismatch'));
});

test('rejects pre-authorized batches and duplicate migrations', () => {
  const duplicate = {
    ...executionPlan,
    batches: [
      { ...executionPlan.batches[0], executionAuthorized: true },
      { ...executionPlan.batches[0], batchId: 'batch-002' },
    ],
  };
  const plan = compileStagingRehearsalPlan({ executionPlan: duplicate, executionPlanBytes: Buffer.from(JSON.stringify(duplicate)), expectedSha: releaseSha });
  assert.equal(plan.accepted, false);
  assert.ok(plan.failures.some((value) => value.startsWith('batch_pre_authorized:')));
  assert.ok(plan.failures.some((value) => value.startsWith('duplicate_migration:')));
});
