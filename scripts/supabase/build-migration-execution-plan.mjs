#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fullSha = /^[a-f0-9]{40}$/i;
const acceptedDecisionStatuses = new Set([
  'RECONCILIATION_ACCEPTED_FOR_STAGING',
  'RECONCILIATION_ACCEPTED',
]);

export function buildExecutionPlan({ decisionResult, pendingPlan, repairPlan, batchSize = 10 }) {
  const failures = [];
  if (decisionResult?.schema !== 'risck-comply.supabase-migration-reconciliation-decision-result.v1') failures.push('unsupported_decision_result');
  if (decisionResult?.accepted !== true || !acceptedDecisionStatuses.has(decisionResult?.decisionStatus)) failures.push('reconciliation_not_accepted_for_staging');
  if (!fullSha.test(String(decisionResult?.releaseSha ?? ''))) failures.push('invalid_release_sha');
  if (decisionResult?.productionWriteAuthorized !== undefined && decisionResult.productionWriteAuthorized !== false) failures.push('unexpected_write_authorization');
  if (pendingPlan?.releaseSha !== decisionResult?.releaseSha || repairPlan?.releaseSha !== decisionResult?.releaseSha) failures.push('release_sha_mismatch');
  if (pendingPlan?.inventorySha256 !== decisionResult?.inventorySha256 || repairPlan?.inventorySha256 !== decisionResult?.inventorySha256) failures.push('inventory_digest_mismatch');
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) failures.push('invalid_batch_size');
  if (failures.length) return { accepted: false, failures };

  const pending = [...(pendingPlan.items ?? [])].sort((a, b) => a.deployOrderDecision - b.deployOrderDecision);
  const seenOrders = new Set();
  for (const item of pending) {
    if (!Number.isInteger(item.deployOrderDecision) || item.deployOrderDecision < 1) failures.push(`invalid_order:${item.filename}`);
    if (seenOrders.has(item.deployOrderDecision)) failures.push(`duplicate_order:${item.deployOrderDecision}`);
    seenOrders.add(item.deployOrderDecision);
    if (!item.schemaEvidenceReference) failures.push(`missing_schema_evidence:${item.filename}`);
    if (!item.rollbackReference) failures.push(`missing_rollback_reference:${item.filename}`);
  }
  if (failures.length) return { accepted: false, failures };

  const batches = [];
  for (let index = 0; index < pending.length; index += batchSize) {
    const items = pending.slice(index, index + batchSize);
    batches.push({
      batchId: `batch-${String(batches.length + 1).padStart(3, '0')}`,
      sequence: batches.length + 1,
      itemCount: items.length,
      items: items.map((item) => ({
        filename: item.filename,
        sha256: item.sha256,
        version: item.version,
        deployOrderDecision: item.deployOrderDecision,
        schemaEvidenceReference: item.schemaEvidenceReference,
        stagedExecutionEvidenceReference: item.stagedExecutionEvidenceReference ?? null,
        rollbackReference: item.rollbackReference,
      })),
      preconditions: {
        exactReleaseSha: decisionResult.releaseSha,
        stagingRehearsalRequired: true,
        stagingProjectMustDifferFromProduction: true,
        backupOrPitrEvidenceReference: null,
        maintenanceWindowReference: null,
        operator: null,
        independentApprover: null,
        protectedEnvironmentApproval: true,
      },
      postconditions: {
        schemaValidationRequired: true,
        migrationHistoryValidationRequired: true,
        rlsRegressionRequired: true,
        applicationSmokeRequired: true,
        rollbackDecisionRequired: true,
      },
      executionAuthorized: false,
    });
  }

  return {
    schema: 'risck-comply.supabase-migration-execution-plan.v1',
    generatedAt: new Date().toISOString(),
    releaseSha: decisionResult.releaseSha,
    inventorySha256: decisionResult.inventorySha256,
    sourceDecisionDigest: sha256(JSON.stringify(decisionResult)),
    accepted: true,
    status: 'PLANNING_COMPLETE_AWAITING_STAGING_REHEARSAL',
    batchSize,
    pendingMigrationCount: pending.length,
    historyRepairCandidateCount: (repairPlan.items ?? []).length,
    stagingRequired: pending.length > 0,
    batches,
    historyRepairCandidates: (repairPlan.items ?? []).map((item) => ({
      filename: item.filename,
      sha256: item.sha256,
      version: item.version,
      schemaEvidenceReference: item.schemaEvidenceReference,
      repairAuthorized: false,
    })),
    globalPreconditions: {
      freshProductionBackupOrPitrEvidence: null,
      stagingCloneValidationEvidence: null,
      maintenanceWindow: null,
      rollbackOwner: null,
      databaseOperator: null,
      independentApprover: null,
      finalDryRunEvidence: null,
    },
    safety: {
      sqlExecuted: false,
      databaseModified: false,
      migrationHistoryModified: false,
      dryRunAuthorized: false,
      productionWriteAuthorized: false,
      stagingEvidenceRequiredBeforeProduction: pending.length > 0,
    },
  };
}

async function main() {
  const [decisionPath, pendingPath, repairPath, outputDir = 'artifacts/supabase-migration-execution-plan'] = process.argv.slice(2);
  if (!decisionPath || !pendingPath || !repairPath) throw new Error('usage: decision-result.json pending-deployment-plan.json migration-history-repair-candidates.json [output-dir]');
  const decisionResult = JSON.parse(await readFile(decisionPath, 'utf8'));
  const pendingPlan = JSON.parse(await readFile(pendingPath, 'utf8'));
  const repairPlan = JSON.parse(await readFile(repairPath, 'utf8'));
  const batchSize = Number(process.env.MIGRATION_BATCH_SIZE ?? 10);
  const plan = buildExecutionPlan({ decisionResult, pendingPlan, repairPlan, batchSize });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'execution-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  if (!plan.accepted) process.exitCode = 2;
  console.log(JSON.stringify(plan, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
