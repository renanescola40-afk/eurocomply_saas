#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/i;
const digest = (value) => createHash('sha256').update(value).digest('hex');

export function compileStagingRehearsalPlan({ executionPlan, executionPlanBytes, expectedSha }) {
  const failures = [];
  const releaseSha = String(expectedSha ?? '').toLowerCase();
  if (!FULL_SHA.test(releaseSha)) failures.push('expected_sha_invalid');
  if (executionPlan?.schema !== 'risck-comply.supabase-migration-execution-plan.v1') failures.push('execution_plan_schema_unsupported');
  if (executionPlan?.accepted !== true) failures.push('execution_plan_not_accepted');
  if (executionPlan?.releaseSha !== releaseSha) failures.push('execution_plan_release_sha_mismatch');
  if (executionPlan?.safety?.productionWriteAuthorized !== false) failures.push('execution_plan_write_boundary_invalid');
  if (!Array.isArray(executionPlan?.batches)) failures.push('execution_plan_batches_missing');
  if (!executionPlan?.generatedAt) failures.push('execution_plan_generated_at_missing');
  if (failures.length) return { accepted: false, failures };

  const seenFiles = new Set();
  const batches = executionPlan.batches.map((batch, index) => {
    if (batch.executionAuthorized !== false) failures.push(`batch_pre_authorized:${batch.batchId ?? index + 1}`);
    const migrations = (batch.items ?? []).map((item) => {
      if (seenFiles.has(item.filename)) failures.push(`duplicate_migration:${item.filename}`);
      seenFiles.add(item.filename);
      if (!item.rollbackReference) failures.push(`rollback_reference_missing:${item.filename}`);
      return {
        version: item.version,
        filename: item.filename,
        sha256: item.sha256,
        deployOrder: item.deployOrderDecision,
        schemaEvidenceReference: item.schemaEvidenceReference ?? null,
        rollbackReference: item.rollbackReference,
      };
    });
    return {
      batch: index + 1,
      batchId: batch.batchId ?? `batch-${String(index + 1).padStart(3, '0')}`,
      migrations,
      preconditions: [
        'staging-project-not-production',
        'staging-backup-or-disposable-clone-ready',
        'operator-approved',
      ],
      postChecks: [
        'migration-history',
        'schema-diff',
        'rls-isolation',
        'authenticated-smoke',
        'rollback-rehearsal',
      ],
      executionAuthorized: false,
    };
  });

  if (failures.length) return { accepted: false, failures };
  return {
    schema: 'risck-comply.supabase-staging-rehearsal-plan.v2',
    generatedAt: executionPlan.generatedAt,
    releaseSha,
    targetSha: releaseSha,
    sourceExecutionPlanDigest: digest(executionPlanBytes),
    accepted: true,
    status: 'AWAITING_STAGING_EXECUTION',
    pendingMigrationCount: seenFiles.size,
    historyRepairCandidates: executionPlan.historyRepairCandidates ?? [],
    batches,
    requiredEnvironment: {
      productionProjectRefMustDiffer: true,
      productionDatabaseUrlMustNotBeUsed: true,
      protectedApprovalRequired: true,
    },
    safety: {
      productionWritePerformed: false,
      migrationHistoryModified: false,
      unrestrictedDbPushAllowed: false,
      automaticExecutionAllowed: false,
    },
  };
}

async function main() {
  const [executionPlanPath, outputDir = 'artifacts/supabase-staging-rehearsal'] = process.argv.slice(2);
  const expectedSha = process.env.EXPECTED_SHA ?? process.env.RELEASE_SHA;
  if (!executionPlanPath) throw new Error('usage: compile-staging-rehearsal-from-execution-plan.mjs <execution-plan.json> [output-dir]');
  const executionPlanBytes = await readFile(executionPlanPath);
  const plan = compileStagingRehearsalPlan({
    executionPlan: JSON.parse(executionPlanBytes),
    executionPlanBytes,
    expectedSha,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'staging-rehearsal-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  if (!plan.accepted && plan.failures?.length) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
