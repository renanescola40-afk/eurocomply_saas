#!/usr/bin/env node

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = await mkdtemp(path.join(tmpdir(), 'bounded-change-'));
const script = path.resolve('scripts/supabase/compile-bounded-production-change.mjs');
const sha = 'a'.repeat(40);
const migration = { filename: '20260101000000_example.sql', sha256: 'b'.repeat(64), version: '20260101000000', deployOrder: 1 };
const rehearsal = {
  schema: 'risck-comply.supabase-staging-rehearsal-attestation.v2',
  status: 'STAGING_REHEARSAL_PASSED',
  releaseSha: sha,
  stagedMigrationSetDigest: 'c'.repeat(64),
  stagedBatches: [{ batch: 1, batchId: 'batch-001', migrations: [migration] }],
};
const rehearsalRaw = JSON.stringify(rehearsal);
const digest = createHash('sha256').update(rehearsalRaw).digest('hex');
const future = Date.now() + 86_400_000;
const approvedAt = new Date(Date.now() - 60_000).toISOString();
const base = {
  schema: 'risck-comply.supabase-bounded-production-change-request.v1',
  releaseSha: sha,
  rehearsalDigest: digest,
  changeType: 'BOUNDED_SUPABASE_MIGRATION_CHANGE',
  productionProjectRef: 'prod-ref',
  stagingProjectRef: 'stage-ref',
  maxBatchSize: 10,
  backup: {
    status: 'verified',
    restoreTestOutcome: 'passed',
    evidenceReference: 'artifact://backup/restore-test',
    rpoMinutes: 15,
    rtoMinutes: 60,
  },
  maintenanceWindow: { startsAt: new Date(future).toISOString(), endsAt: new Date(future + 3_600_000).toISOString() },
  roles: { operator: 'operator', approver: 'approver', incidentCommander: 'ic', rollbackOwner: 'rollback' },
  approval: {
    status: 'approved',
    approver: 'approver',
    approvedAt,
    expiresAt: new Date(future + 7_200_000).toISOString(),
    evidenceReference: 'github://environment/approval',
  },
  rollback: { commandReference: 'runbook#rollback', decisionThreshold: 'any critical validation failure' },
  postChange: { requiredChecks: ['migration_history', 'schema', 'rls_cross_tenant', 'authenticated_smoke', 'observability'] },
  batches: [{
    id: 'batch-001',
    executionAuthorized: false,
    rollbackReference: 'rollback/batch-001',
    validationChecks: ['migration_history', 'schema', 'rls_cross_tenant', 'authenticated_smoke'],
    migrations: [{ filename: migration.filename, sha256: migration.sha256 }],
  }],
  historyRepairCandidates: [],
};

async function run(name, mutate, expectedExit) {
  const dir = path.join(root, name);
  const rehearsalPath = path.join(root, `${name}-rehearsal.json`);
  const requestPath = path.join(root, `${name}-request.json`);
  const request = structuredClone(base);
  mutate?.(request);
  await writeFile(rehearsalPath, rehearsalRaw);
  await writeFile(requestPath, JSON.stringify(request));
  const result = spawnSync(process.execPath, [script, rehearsalPath, requestPath, dir], { encoding: 'utf8' });
  if (result.status !== expectedExit) {
    throw new Error(`${name}: expected ${expectedExit}, got ${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(await readFile(path.join(dir, 'bounded-production-change.json'), 'utf8'));
}

const valid = await run('valid', null, 0);
if (valid.status !== 'READY_FOR_PROTECTED_PRODUCTION_EXECUTION') throw new Error('valid request was not accepted');
if (valid.safety.productionWritePerformed !== false) throw new Error('compiler claimed a production write');
if (valid.controls.stagedMigrationSetBound !== true) throw new Error('staged migration set was not bound');

const selfApproved = await run('self-approved', (request) => {
  request.roles.approver = request.roles.operator;
  request.approval.approver = request.roles.operator;
}, 2);
if (!selfApproved.blockers.includes('operator_must_not_approve')) throw new Error('self approval was not rejected');

const duplicate = await run('duplicate', (request) => { request.batches.push(structuredClone(request.batches[0])); }, 2);
if (!duplicate.blockers.some((item) => item.startsWith('duplicate_batch_id:'))) throw new Error('duplicate batch was not rejected');

const wrongSha = await run('wrong-sha', (request) => { request.releaseSha = 'c'.repeat(40); }, 2);
if (!wrongSha.blockers.includes('release_sha_mismatch')) throw new Error('SHA mismatch was not rejected');

const noRestore = await run('no-restore', (request) => { request.backup.restoreTestOutcome = 'failed'; }, 2);
if (!noRestore.blockers.includes('restore_test_not_passed')) throw new Error('missing restore proof was not rejected');

const unstaged = await run('unstaged', (request) => {
  request.batches[0].migrations[0] = { filename: '20260102000000_unstaged.sql', sha256: 'd'.repeat(64) };
}, 2);
if (!unstaged.blockers.some((item) => item.startsWith('migration_not_staged:'))) throw new Error('unstaged migration was not rejected');

const digestMismatch = await run('digest-mismatch', (request) => {
  request.batches[0].migrations[0].sha256 = 'e'.repeat(64);
}, 2);
if (!digestMismatch.blockers.some((item) => item.startsWith('staged_migration_digest_mismatch:'))) throw new Error('staged digest mismatch was not rejected');

console.log('bounded production change contracts passed');
