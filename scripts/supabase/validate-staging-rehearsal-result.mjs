#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const digest = (value) => createHash('sha256').update(value).digest('hex');

export function validateStagingRehearsalResult({ plan, planRaw, result, resultRaw, expectedSha }) {
  const releaseSha = String(expectedSha ?? '').toLowerCase();
  const planSha = String(plan?.releaseSha ?? plan?.targetSha ?? '').toLowerCase();
  const resultSha = String(result?.releaseSha ?? result?.targetSha ?? '').toLowerCase();
  if (!releaseSha || planSha !== releaseSha || resultSha !== releaseSha) throw new Error('Exact subject SHA mismatch');
  if (!['risck-comply.supabase-staging-rehearsal-plan.v1', 'risck-comply.supabase-staging-rehearsal-plan.v2'].includes(plan?.schema)) {
    throw new Error('Unsupported staging rehearsal plan schema');
  }
  if (result?.schema !== 'risck-comply.supabase-staging-rehearsal-result.v2') throw new Error('Unsupported staging rehearsal result schema');
  if (result.planDigest !== digest(planRaw)) throw new Error('Staging result is not bound to the exact plan digest');
  if (!result.stagingProjectRef || !result.productionProjectRef) throw new Error('Staging and production project refs are required');
  if (result.stagingProjectRef === result.productionProjectRef) throw new Error('Staging project must differ from production');
  if (!result.operator || !result.approver) throw new Error('Operator and approver are required');
  if (result.operator === result.approver) throw new Error('Operator and approver must be different');
  if (result.status !== 'Complete' || result.outcome !== 'passed') throw new Error('Staging rehearsal did not pass');
  if (!result.startedAt || !result.completedAt) throw new Error('Staging execution timestamps are required');
  const startedAt = new Date(result.startedAt);
  const completedAt = new Date(result.completedAt);
  if (!Number.isFinite(startedAt.valueOf()) || !Number.isFinite(completedAt.valueOf()) || completedAt <= startedAt) {
    throw new Error('Invalid staging execution timestamps');
  }
  if (!Array.isArray(result.batches) || result.batches.length !== plan.batches.length) throw new Error('Batch result count mismatch');

  const expectedBatchIds = new Set(plan.batches.map((batch) => batch.batch));
  for (const batch of result.batches) {
    if (!expectedBatchIds.has(batch.batch)) throw new Error(`Unexpected batch ${batch.batch}`);
    if (batch.outcome !== 'passed') throw new Error(`Batch ${batch.batch} failed`);
    for (const key of ['migrationHistoryEvidence', 'schemaDiffEvidence', 'rlsEvidence', 'smokeEvidence', 'rollbackEvidence']) {
      if (!batch[key]) throw new Error(`Batch ${batch.batch} missing ${key}`);
    }
  }

  return {
    schema: 'risck-comply.supabase-staging-rehearsal-attestation.v2',
    generatedAt: new Date().toISOString(),
    releaseSha,
    targetSha: releaseSha,
    status: 'STAGING_REHEARSAL_PASSED',
    planDigest: digest(planRaw),
    resultDigest: digest(resultRaw),
    batchesPassed: result.batches.length,
    operator: result.operator,
    approver: result.approver,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    nextStep: 'PREPARE_BOUNDED_PRODUCTION_CHANGE_REQUEST',
    safety: {
      productionWritePerformed: false,
      productionPushAuthorized: false,
      automaticExecutionAllowed: false,
    },
  };
}

async function main() {
  const [planPath, resultPath, outputDir = 'artifacts/supabase-staging-rehearsal-result'] = process.argv.slice(2);
  if (!planPath || !resultPath) throw new Error('Usage: validate-staging-rehearsal-result.mjs <plan.json> <result.json> [output-dir]');
  const planRaw = await readFile(planPath, 'utf8');
  const resultRaw = await readFile(resultPath, 'utf8');
  const expectedSha = process.env.EXPECTED_SHA ?? process.env.RELEASE_SHA;
  const attestation = validateStagingRehearsalResult({
    plan: JSON.parse(planRaw),
    planRaw,
    result: JSON.parse(resultRaw),
    resultRaw,
    expectedSha,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'staging-rehearsal-attestation.json'), `${JSON.stringify(attestation, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(attestation)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
