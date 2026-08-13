import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { evaluateReleaseControlPlane } from './build-migration-release-control-plane.mjs';

const sha = 'a'.repeat(40);
const hash = (value) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const plan = {
    schema: 'risck-comply.supabase-migration-execution-plan.v1',
    generatedAt: '2026-08-13T20:00:00.000Z',
    releaseSha: sha,
    accepted: true,
    status: 'PLANNING_COMPLETE_AWAITING_STAGING_REHEARSAL',
    batches: [{
      batchId: 'batch-001',
      sequence: 1,
      itemCount: 1,
      items: [{
        filename: '20260813000000_example.sql',
        sha256: 'b'.repeat(64),
        version: '20260813000000',
        deployOrderDecision: 1,
        schemaEvidenceReference: 'artifact://schema',
        rollbackReference: 'artifact://rollback',
      }],
      executionAuthorized: false,
    }],
    safety: {
      sqlExecuted: false,
      databaseModified: false,
      migrationHistoryModified: false,
      dryRunAuthorized: false,
      productionWriteAuthorized: false,
    },
  };
  const stagedBatches = [{
    batch: 1,
    batchId: 'batch-001',
    migrations: [{
      filename: '20260813000000_example.sql',
      sha256: 'b'.repeat(64),
      version: '20260813000000',
      deployOrder: 1,
    }],
  }];
  const rehearsal = {
    schema: 'risck-comply.supabase-staging-rehearsal-attestation.v2',
    releaseSha: sha,
    targetSha: sha,
    status: 'STAGING_REHEARSAL_PASSED',
    stagedMigrationSetDigest: hash(JSON.stringify(stagedBatches)),
    batchesPassed: 1,
    stagedBatches,
    operator: 'operator-a',
    approver: 'reviewer-b',
    safety: {
      productionWritePerformed: false,
      productionPushAuthorized: false,
      automaticExecutionAllowed: false,
    },
  };
  const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const rehearsalBytes = Buffer.from(`${JSON.stringify(rehearsal, null, 2)}\n`);
  const authorization = {
    schema: 'risck-comply.supabase-migration-production-authorization.v1',
    releaseSha: sha,
    executionPlanSha256: hash(planBytes),
    rehearsalSha256: hash(rehearsalBytes),
    status: 'APPROVED',
    backupOrPitrReference: 'artifact://backup',
    maintenanceWindowReference: 'change://window',
    incidentCommander: 'commander-a',
    databaseOperator: 'operator-a',
    independentApprover: 'reviewer-b',
    approvalReference: 'change://approval',
    rollbackOwner: 'rollback-a',
    automaticExecutionAllowed: false,
  };
  return {
    executionPlan: plan,
    executionPlanBytes: planBytes,
    rehearsal,
    rehearsalBytes,
    authorization,
    expectedReleaseSha: sha,
  };
}

test('accepts current plan and staging attestation contracts without granting execution', () => {
  const result = evaluateReleaseControlPlane(fixture());
  assert.equal(result.accepted, true);
  assert.equal(result.schema, 'risck-comply.supabase-migration-release-control-plane-result.v2');
  assert.equal(result.batchCount, 1);
  assert.equal(result.migrationCount, 1);
  assert.equal(result.authorization.productionWriteAuthorizedByThisArtifact, false);
  assert.equal(result.authorization.automaticExecutionAllowed, false);
});

test('blocks a plan that was not accepted', () => {
  const input = fixture();
  input.executionPlan.accepted = false;
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reconciliation_not_accepted'));
});

test('rejects duplicate deploy ordering', () => {
  const input = fixture();
  input.executionPlan.batches[0].items.push({
    ...input.executionPlan.batches[0].items[0],
    filename: '20260813000001_second.sql',
    sha256: 'c'.repeat(64),
    version: '20260813000001',
  });
  input.executionPlan.batches[0].itemCount = 2;
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('duplicate_deploy_order_1'));
});

test('rejects staged migration identity drift', () => {
  const input = fixture();
  input.rehearsal.stagedBatches[0].migrations[0].sha256 = '0'.repeat(64);
  input.rehearsal.stagedMigrationSetDigest = hash(JSON.stringify(input.rehearsal.stagedBatches));
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('staging_batch_1_item_1_identity_mismatch'));
});

test('rejects staging evidence that crosses the write boundary', () => {
  const input = fixture();
  input.rehearsal.safety.productionWritePerformed = true;
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('rehearsal_must_not_write_production'));
});

test('requires separate staging operator and reviewer', () => {
  const input = fixture();
  input.rehearsal.approver = input.rehearsal.operator;
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('staging_operator_and_approver_must_differ'));
});

test('binds authorization to exact rehearsal bytes', () => {
  const input = fixture();
  input.authorization.rehearsalSha256 = hash(Buffer.from(JSON.stringify(input.rehearsal)));
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('authorization_rehearsal_digest_mismatch'));
});

test('requires separate release operator and reviewer', () => {
  const input = fixture();
  input.authorization.independentApprover = input.authorization.databaseOperator;
  const result = evaluateReleaseControlPlane(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('operator_and_approver_must_differ'));
});
