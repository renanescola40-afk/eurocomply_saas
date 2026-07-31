#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [planPath, resultPath, outputDir = 'artifacts/supabase-staging-rehearsal-result'] = process.argv.slice(2);
if (!planPath || !resultPath) throw new Error('Usage: validate-staging-rehearsal-result.mjs <plan.json> <result.json> [output-dir]');

const plan = JSON.parse(await readFile(planPath, 'utf8'));
const result = JSON.parse(await readFile(resultPath, 'utf8'));
const expectedSha = process.env.EXPECTED_SHA ?? process.env.GITHUB_SHA;
if (!expectedSha || plan.targetSha !== expectedSha || result.targetSha !== expectedSha) throw new Error('Exact SHA mismatch');
if (result.stagingProjectRef === result.productionProjectRef) throw new Error('Staging project must differ from production');
if (result.operator === result.approver) throw new Error('Operator and approver must be different');
if (result.status !== 'Complete' || result.outcome !== 'passed') throw new Error('Staging rehearsal did not pass');
if (!Array.isArray(result.batches) || result.batches.length !== plan.batches.length) throw new Error('Batch result count mismatch');

const expectedBatchIds = new Set(plan.batches.map((batch) => batch.batch));
for (const batch of result.batches) {
  if (!expectedBatchIds.has(batch.batch)) throw new Error(`Unexpected batch ${batch.batch}`);
  if (batch.outcome !== 'passed') throw new Error(`Batch ${batch.batch} failed`);
  for (const key of ['migrationHistoryEvidence','schemaDiffEvidence','rlsEvidence','smokeEvidence','rollbackEvidence']) {
    if (!batch[key]) throw new Error(`Batch ${batch.batch} missing ${key}`);
  }
}

const attestation = {
  schema: 'risck-comply.supabase-staging-rehearsal-attestation.v1',
  generatedAt: new Date().toISOString(),
  targetSha: expectedSha,
  status: 'STAGING_REHEARSAL_PASSED',
  planDigest: createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
  resultDigest: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
  batchesPassed: result.batches.length,
  operator: result.operator,
  approver: result.approver,
  nextStep: 'PREPARE_BOUNDED_PRODUCTION_CHANGE_REQUEST',
  safety: {
    productionWritePerformed: false,
    productionPushAuthorized: false,
    automaticExecutionAllowed: false,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'staging-rehearsal-attestation.json'), JSON.stringify(attestation, null, 2) + '\n');
process.stdout.write(JSON.stringify(attestation) + '\n');
