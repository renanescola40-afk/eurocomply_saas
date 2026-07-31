#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [reconciliationPath, outputDir = 'artifacts/supabase-staging-rehearsal'] = process.argv.slice(2);
if (!reconciliationPath) throw new Error('Usage: compile-staging-rehearsal-plan.mjs <accepted-reconciliation.json> [output-dir]');

const source = JSON.parse(await readFile(reconciliationPath, 'utf8'));
const expectedSha = process.env.EXPECTED_SHA ?? process.env.GITHUB_SHA;
if (!expectedSha || source.targetSha !== expectedSha) throw new Error('Reconciliation targetSha must match the exact expected SHA');
if (source.status !== 'READY_FOR_STAGING_REHEARSAL') throw new Error('Reconciliation is not ready for staging rehearsal');
if (!Array.isArray(source.items) || source.items.length === 0) throw new Error('Reconciliation contains no reviewed items');

const pending = source.items.filter((item) => item.classification === 'PENDING_DEPLOYMENT');
const historyRepair = source.items.filter((item) => item.classification === 'ALREADY_PRESENT_IN_SCHEMA');
const unresolved = source.items.filter((item) => item.classification === 'REQUIRES_SPLIT_REVIEW');
if (unresolved.length > 0) throw new Error('Split-review items must be resolved before rehearsal');

for (const item of pending) {
  if (!Number.isInteger(item.deployOrderDecision) || item.deployOrderDecision < 1) throw new Error(`Missing deploy order: ${item.filename}`);
  if (!item.stagingEvidenceReference || !item.rollbackReference) throw new Error(`Missing staging or rollback reference: ${item.filename}`);
}
const ordered = [...pending].sort((a, b) => a.deployOrderDecision - b.deployOrderDecision);
const orderSet = new Set(ordered.map((item) => item.deployOrderDecision));
if (orderSet.size !== ordered.length) throw new Error('Duplicate deployment order detected');

const batchSize = Number(process.env.REHEARSAL_BATCH_SIZE ?? 10);
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) throw new Error('REHEARSAL_BATCH_SIZE must be between 1 and 25');
const batches = [];
for (let index = 0; index < ordered.length; index += batchSize) {
  const migrations = ordered.slice(index, index + batchSize);
  batches.push({
    batch: batches.length + 1,
    migrations: migrations.map((item) => ({
      version: item.version,
      filename: item.filename,
      sha256: item.sha256,
      deployOrder: item.deployOrderDecision,
      rollbackReference: item.rollbackReference,
    })),
    preconditions: ['staging-backup-captured', 'staging-project-not-production', 'operator-approved'],
    postChecks: ['migration-history', 'schema-diff', 'rls-isolation', 'authenticated-smoke'],
    executionAuthorized: false,
  });
}

const plan = {
  schema: 'risck-comply.supabase-staging-rehearsal-plan.v1',
  generatedAt: new Date().toISOString(),
  targetSha: expectedSha,
  sourceReconciliationDigest: createHash('sha256').update(JSON.stringify(source)).digest('hex'),
  status: 'AWAITING_STAGING_EXECUTION',
  historyRepairCandidates: historyRepair.map((item) => ({ version: item.version, filename: item.filename, objectProofDigest: item.objectProofDigest })),
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

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'staging-rehearsal-plan.json'), JSON.stringify(plan, null, 2) + '\n');
process.stdout.write(JSON.stringify({ status: plan.status, batches: batches.length, pending: ordered.length, historyRepair: historyRepair.length }) + '\n');
