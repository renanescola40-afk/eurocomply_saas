#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'staging-rehearsal-'));
const sha = 'a'.repeat(40);
const reconciliation = {
  targetSha: sha,
  status: 'READY_FOR_STAGING_REHEARSAL',
  items: [
    { classification: 'PENDING_DEPLOYMENT', version: '20260101000000', filename: '20260101000000_one.sql', sha256: '1'.repeat(64), deployOrderDecision: 1, stagingEvidenceReference: 'review:1', rollbackReference: 'rollback:1' },
    { classification: 'ALREADY_PRESENT_IN_SCHEMA', version: '20260102000000', filename: '20260102000000_two.sql', objectProofDigest: '2'.repeat(64) },
  ],
};
const reconciliationPath = path.join(root, 'reconciliation.json');
await writeFile(reconciliationPath, JSON.stringify(reconciliation));
let run = spawnSync(process.execPath, ['scripts/supabase/compile-staging-rehearsal-plan.mjs', reconciliationPath, path.join(root, 'plan')], { encoding: 'utf8', env: { ...process.env, EXPECTED_SHA: sha } });
assert.equal(run.status, 0, run.stderr);
const plan = JSON.parse(await readFile(path.join(root, 'plan/staging-rehearsal-plan.json'), 'utf8'));
assert.equal(plan.safety.productionWritePerformed, false);
assert.equal(plan.safety.automaticExecutionAllowed, false);
assert.equal(plan.batches.length, 1);

const bad = structuredClone(reconciliation);
bad.items.push({ classification: 'REQUIRES_SPLIT_REVIEW', filename: 'legacy.sql' });
await writeFile(reconciliationPath, JSON.stringify(bad));
run = spawnSync(process.execPath, ['scripts/supabase/compile-staging-rehearsal-plan.mjs', reconciliationPath, path.join(root, 'bad')], { encoding: 'utf8', env: { ...process.env, EXPECTED_SHA: sha } });
assert.notEqual(run.status, 0);

const result = {
  targetSha: sha,
  stagingProjectRef: 'stage-project',
  productionProjectRef: 'prod-project',
  operator: 'db-operator',
  approver: 'security-reviewer',
  status: 'Complete',
  outcome: 'passed',
  batches: [{ batch: 1, outcome: 'passed', migrationHistoryEvidence: 'artifact:history', schemaDiffEvidence: 'artifact:schema', rlsEvidence: 'artifact:rls', smokeEvidence: 'artifact:smoke', rollbackEvidence: 'artifact:rollback' }],
};
const resultPath = path.join(root, 'result.json');
await writeFile(resultPath, JSON.stringify(result));
run = spawnSync(process.execPath, ['scripts/supabase/validate-staging-rehearsal-result.mjs', path.join(root, 'plan/staging-rehearsal-plan.json'), resultPath, path.join(root, 'attestation')], { encoding: 'utf8', env: { ...process.env, EXPECTED_SHA: sha } });
assert.equal(run.status, 0, run.stderr);

result.stagingProjectRef = result.productionProjectRef;
await writeFile(resultPath, JSON.stringify(result));
run = spawnSync(process.execPath, ['scripts/supabase/validate-staging-rehearsal-result.mjs', path.join(root, 'plan/staging-rehearsal-plan.json'), resultPath, path.join(root, 'rejected')], { encoding: 'utf8', env: { ...process.env, EXPECTED_SHA: sha } });
assert.notEqual(run.status, 0);

console.log('staging rehearsal contracts passed');
