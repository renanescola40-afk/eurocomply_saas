import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateReleaseControlPlane } from './build-migration-release-control-plane.mjs';

const sha = 'a'.repeat(40);
const item = {
  filename: '20260101000000_example.sql',
  sha256: 'b'.repeat(64),
  deployOrderDecision: 1,
  stagedExecutionEvidenceReference: 'artifact://staging/1',
  rollbackReference: 'runbook://rollback/1',
};
const plan = {
  schema: 'risck-comply.supabase-migration-execution-plan.v1',
  releaseSha: sha,
  decisionStatus: 'RECONCILIATION_ACCEPTED',
  dryRunAuthorized: false,
  productionWriteAuthorized: false,
  deploymentBatches: [{
    batchNumber: 1,
    items: [item],
    stagingEvidenceReference: 'artifact://batch/staging',
    rollbackEvidenceReference: 'artifact://batch/rollback',
    preBatchSnapshotReference: 'artifact://snapshot',
  }],
};
const planBytes = Buffer.from(JSON.stringify(plan));
const rehearsal = {
  schema: 'risck-comply.supabase-migration-staging-rehearsal.v1',
  releaseSha: sha,
  executionPlanSha256: 'placeholder',
  status: 'PASSED',
  productionDatabaseUsed: false,
  allBatchesPassed: true,
  stagingCloneReference: 'artifact://clone',
  dryRunOutputReference: 'artifact://dry-run',
  rlsValidationReference: 'artifact://rls',
  applicationSmokeReference: 'artifact://smoke',
  rollbackRehearsalReference: 'artifact://rollback',
};

function authorization(rehearsalSha256) {
  return {
    schema: 'risck-comply.supabase-migration-production-authorization.v1',
    releaseSha: sha,
    executionPlanSha256: 'placeholder',
    rehearsalSha256,
    status: 'APPROVED',
    backupOrPitrReference: 'artifact://backup',
    maintenanceWindowReference: 'calendar://window',
    incidentCommander: 'incident-commander@example.invalid',
    databaseOperator: 'operator@example.invalid',
    independentApprover: 'approver@example.invalid',
    approvalReference: 'change://123',
    rollbackOwner: 'rollback@example.invalid',
    automaticExecutionAllowed: false,
  };
}

async function validInput() {
  const { createHash } = await import('node:crypto');
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const fixedRehearsal = { ...rehearsal, executionPlanSha256: hash(planBytes) };
  return {
    executionPlan: plan,
    executionPlanBytes: planBytes,
    rehearsal: fixedRehearsal,
    authorization: {
      ...authorization(hash(Buffer.from(JSON.stringify(fixedRehearsal)))),
      executionPlanSha256: hash(planBytes),
    },
    expectedReleaseSha: sha,
  };
}

test('accepts complete prerequisites but never authorizes production write', async () => {
  const result = evaluateReleaseControlPlane(await validInput());
  assert.equal(result.accepted, true);
  assert.equal(result.authorization.productionWriteAuthorizedByThisArtifact, false);
  assert.equal(result.authorization.automaticExecutionAllowed, false);
});

test('fails when reconciliation was not accepted', async () => {
  const input = await validInput();
  input.executionPlan = { ...input.executionPlan, decisionStatus: 'HUMAN_REVIEW_REQUIRED' };
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reconciliation_not_accepted'));
});

test('fails duplicate deployment ordering', async () => {
  const input = await validInput();
  input.executionPlan = {
    ...input.executionPlan,
    deploymentBatches: [{ ...input.executionPlan.deploymentBatches[0], items: [item, { ...item, filename: '20260101000001_second.sql' }] }],
  };
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('duplicate_deploy_order_1'));
});

test('fails when staging used production database', async () => {
  const input = await validInput();
  input.rehearsal = { ...input.rehearsal, productionDatabaseUsed: true };
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('rehearsal_must_not_use_production_database'));
});

test('fails when operator and approver are the same person', async () => {
  const input = await validInput();
  input.authorization = { ...input.authorization, independentApprover: input.authorization.databaseOperator };
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('operator_and_approver_must_differ'));
});
