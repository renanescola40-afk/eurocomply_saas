#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const digest = (value) => createHash('sha256').update(value).digest('hex');

function unique(values) {
  return [...new Set(values)];
}

function requireEvidence(value, key, failures) {
  if (!nonEmpty(value)) failures.push(`${key}_required`);
}

function validateExecutionPlan(executionPlan, releaseSha, failures, blockers) {
  if (executionPlan?.schema !== 'risck-comply.supabase-migration-execution-plan.v1') {
    failures.push('execution_plan_schema_invalid');
    return [];
  }
  if (executionPlan?.releaseSha !== releaseSha) failures.push('execution_plan_release_sha_mismatch');
  if (executionPlan?.accepted !== true) blockers.push('reconciliation_not_accepted');
  if (executionPlan?.status !== 'PLANNING_COMPLETE_AWAITING_STAGING_REHEARSAL') {
    blockers.push('execution_plan_not_ready_for_staging');
  }

  const safety = executionPlan?.safety ?? {};
  if (
    safety.sqlExecuted !== false
    || safety.databaseModified !== false
    || safety.migrationHistoryModified !== false
    || safety.dryRunAuthorized !== false
    || safety.productionWriteAuthorized !== false
  ) {
    failures.push('execution_plan_safety_boundary_invalid');
  }

  const batches = Array.isArray(executionPlan?.batches) ? executionPlan.batches : [];
  if (!Array.isArray(executionPlan?.batches)) failures.push('execution_plan_batches_missing');

  const seenOrders = new Set();
  const seenFiles = new Set();
  const seenVersions = new Set();

  batches.forEach((batch, index) => {
    const prefix = `batch_${index + 1}`;
    if (!nonEmpty(batch?.batchId)) failures.push(`${prefix}_id_invalid`);
    if (!Number.isInteger(batch?.sequence) || batch.sequence !== index + 1) failures.push(`${prefix}_sequence_invalid`);
    if (batch?.executionAuthorized !== false) failures.push(`${prefix}_must_not_be_pre_authorized`);

    const items = Array.isArray(batch?.items) ? batch.items : [];
    if (items.length === 0 || items.length > 25) failures.push(`${prefix}_size_invalid`);
    if (Number.isInteger(batch?.itemCount) && batch.itemCount !== items.length) failures.push(`${prefix}_item_count_mismatch`);

    for (const item of items) {
      if (!nonEmpty(item?.filename) || !SHA256.test(String(item?.sha256 ?? ''))) {
        failures.push(`${prefix}_item_identity_invalid`);
        continue;
      }
      if (seenFiles.has(item.filename)) failures.push(`duplicate_filename:${item.filename}`);
      seenFiles.add(item.filename);
      if (nonEmpty(item.version)) {
        if (seenVersions.has(item.version)) failures.push(`duplicate_version:${item.version}`);
        seenVersions.add(item.version);
      }
      if (!Number.isInteger(item?.deployOrderDecision) || item.deployOrderDecision < 1) {
        failures.push(`${prefix}_deploy_order_invalid`);
      } else if (seenOrders.has(item.deployOrderDecision)) {
        failures.push(`duplicate_deploy_order_${item.deployOrderDecision}`);
      } else {
        seenOrders.add(item.deployOrderDecision);
      }
      requireEvidence(item.schemaEvidenceReference, `${prefix}_${item.filename}_schema_evidence`, failures);
      requireEvidence(item.rollbackReference, `${prefix}_${item.filename}_rollback`, failures);
    }
  });

  return batches;
}

function validateStagingAttestation(rehearsal, executionBatches, releaseSha, failures, blockers) {
  if (rehearsal?.schema !== 'risck-comply.supabase-staging-rehearsal-attestation.v2') {
    failures.push('rehearsal_schema_invalid');
    return;
  }
  if (rehearsal?.releaseSha !== releaseSha || rehearsal?.targetSha !== releaseSha) {
    failures.push('rehearsal_release_sha_mismatch');
  }
  if (rehearsal?.status !== 'STAGING_REHEARSAL_PASSED') blockers.push('staging_rehearsal_not_passed');
  if (rehearsal?.safety?.productionWritePerformed !== false) failures.push('rehearsal_must_not_write_production');
  if (rehearsal?.safety?.productionPushAuthorized !== false) failures.push('rehearsal_must_not_authorize_production_push');
  if (rehearsal?.safety?.automaticExecutionAllowed !== false) failures.push('rehearsal_automatic_execution_must_be_false');

  requireEvidence(rehearsal?.operator, 'staging_operator', failures);
  requireEvidence(rehearsal?.approver, 'staging_approver', failures);
  if (nonEmpty(rehearsal?.operator) && rehearsal.operator === rehearsal.approver) {
    failures.push('staging_operator_and_approver_must_differ');
  }

  const stagedBatches = Array.isArray(rehearsal?.stagedBatches) ? rehearsal.stagedBatches : [];
  if (stagedBatches.length !== executionBatches.length) failures.push('staging_batch_count_mismatch');
  if (rehearsal?.batchesPassed !== executionBatches.length) failures.push('staging_batches_passed_mismatch');
  if (!SHA256.test(String(rehearsal?.stagedMigrationSetDigest ?? ''))) failures.push('staging_migration_set_digest_invalid');
  else if (rehearsal.stagedMigrationSetDigest !== digest(JSON.stringify(stagedBatches))) {
    failures.push('staging_migration_set_digest_mismatch');
  }

  for (let index = 0; index < Math.min(executionBatches.length, stagedBatches.length); index += 1) {
    const planned = executionBatches[index];
    const staged = stagedBatches[index];
    if (staged?.batch !== index + 1) failures.push(`staging_batch_${index + 1}_number_mismatch`);
    if (staged?.batchId !== planned?.batchId) failures.push(`staging_batch_${index + 1}_id_mismatch`);

    const plannedItems = Array.isArray(planned?.items) ? planned.items : [];
    const stagedItems = Array.isArray(staged?.migrations) ? staged.migrations : [];
    if (stagedItems.length !== plannedItems.length) {
      failures.push(`staging_batch_${index + 1}_item_count_mismatch`);
      continue;
    }
    for (let itemIndex = 0; itemIndex < plannedItems.length; itemIndex += 1) {
      const plannedItem = plannedItems[itemIndex];
      const stagedItem = stagedItems[itemIndex];
      if (
        stagedItem?.filename !== plannedItem?.filename
        || stagedItem?.sha256 !== plannedItem?.sha256
        || stagedItem?.version !== plannedItem?.version
        || stagedItem?.deployOrder !== plannedItem?.deployOrderDecision
      ) {
        failures.push(`staging_batch_${index + 1}_item_${itemIndex + 1}_identity_mismatch`);
      }
    }
  }
}

export function evaluateReleaseControlPlane({
  executionPlan,
  executionPlanBytes,
  rehearsal,
  rehearsalBytes,
  authorization,
  expectedReleaseSha,
}) {
  const failures = [];
  const blockers = [];
  const releaseSha = String(expectedReleaseSha ?? '').toLowerCase();

  if (!SHA.test(releaseSha)) failures.push('expected_release_sha_invalid');
  const executionBatches = validateExecutionPlan(executionPlan, releaseSha, failures, blockers);
  validateStagingAttestation(rehearsal, executionBatches, releaseSha, failures, blockers);

  const planSha256 = digest(executionPlanBytes);
  const rehearsalSha256 = digest(rehearsalBytes ?? Buffer.from(JSON.stringify(rehearsal)));

  if (authorization?.schema !== 'risck-comply.supabase-migration-production-authorization.v1') failures.push('authorization_schema_invalid');
  if (authorization?.releaseSha !== releaseSha) failures.push('authorization_release_sha_mismatch');
  if (authorization?.executionPlanSha256 !== planSha256) failures.push('authorization_plan_digest_mismatch');
  if (authorization?.rehearsalSha256 !== rehearsalSha256) failures.push('authorization_rehearsal_digest_mismatch');
  if (authorization?.status !== 'APPROVED') blockers.push('production_authorization_not_approved');
  requireEvidence(authorization?.backupOrPitrReference, 'backup_or_pitr_reference', failures);
  requireEvidence(authorization?.maintenanceWindowReference, 'maintenance_window_reference', failures);
  requireEvidence(authorization?.incidentCommander, 'incident_commander', failures);
  requireEvidence(authorization?.databaseOperator, 'database_operator', failures);
  requireEvidence(authorization?.independentApprover, 'independent_approver', failures);
  requireEvidence(authorization?.approvalReference, 'approval_reference', failures);
  requireEvidence(authorization?.rollbackOwner, 'rollback_owner', failures);
  if (nonEmpty(authorization?.databaseOperator) && authorization.databaseOperator === authorization.independentApprover) {
    failures.push('operator_and_approver_must_differ');
  }
  if (authorization?.automaticExecutionAllowed !== false) failures.push('automatic_execution_must_be_false');

  const accepted = failures.length === 0 && blockers.length === 0;
  const migrationCount = executionBatches.reduce((sum, batch) => sum + (Array.isArray(batch.items) ? batch.items.length : 0), 0);

  return {
    schema: 'risck-comply.supabase-migration-release-control-plane-result.v2',
    generatedAt: new Date().toISOString(),
    releaseSha,
    executionPlanSha256: planSha256,
    stagingRehearsalSha256: rehearsalSha256,
    status: accepted ? 'READY_FOR_SEPARATE_MANUAL_PRODUCTION_WORKFLOW' : 'BLOCKED',
    accepted,
    failures: unique(failures),
    blockers: unique(blockers),
    batchCount: executionBatches.length,
    migrationCount,
    authorization: {
      stagingRehearsalAccepted: accepted,
      productionWorkflowMayBeRequested: accepted,
      productionWriteAuthorizedByThisArtifact: false,
      automaticExecutionAllowed: false,
    },
    mandatoryProductionSequence: [
      'verify exact current main SHA',
      'verify retained execution-plan and staging-attestation digests',
      'confirm backup or PITR restore point',
      'execute history repair separately when independently approved',
      'execute one reviewed deployment batch at a time',
      'run schema and migration-history verification',
      'run live RLS tenant isolation validation',
      'run authenticated application smoke tests',
      'stop and rollback on any failed post-batch control',
      'publish immutable post-execution attestation',
    ],
    safety: {
      databaseModified: false,
      migrationHistoryModified: false,
      sqlExecuted: false,
      productionWriteAuthorized: false,
      automaticExecutionAllowed: false,
      note: 'This control-plane artifact validates prerequisites only. Production execution requires a distinct protected manual workflow and fresh independent approval.',
    },
  };
}

export async function writeArtifacts(outputDir, result) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'release-control-plane-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(path.join(outputDir, 'summary.md'), [
    '# Supabase migration release control plane',
    '',
    `- Status: \`${result.status}\``,
    `- Release SHA: \`${result.releaseSha}\``,
    `- Batches: ${result.batchCount}`,
    `- Migrations: ${result.migrationCount}`,
    `- Failures: ${result.failures.length}`,
    `- Blockers: ${result.blockers.length}`,
    '- Production write authorized by this artifact: no',
    '- Automatic execution allowed: no',
    '',
  ].join('\n'));
}

async function runCli() {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const [planPath, rehearsalPath, authorizationPath, outputDir = 'artifacts/supabase-migration-release-control-plane'] = positional;
  const expected = args.find((arg) => arg.startsWith('--expected-sha='))?.split('=')[1] ?? process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  if (!planPath || !rehearsalPath || !authorizationPath) {
    throw new Error('usage: execution-plan.json staging-rehearsal-attestation.json authorization.json [output-dir] --expected-sha=<sha>');
  }
  const executionPlanBytes = await readFile(planPath);
  const rehearsalBytes = await readFile(rehearsalPath);
  const executionPlan = JSON.parse(executionPlanBytes.toString('utf8'));
  const rehearsal = JSON.parse(rehearsalBytes.toString('utf8'));
  const authorization = JSON.parse(await readFile(authorizationPath, 'utf8'));
  const result = evaluateReleaseControlPlane({
    executionPlan,
    executionPlanBytes,
    rehearsal,
    rehearsalBytes,
    authorization,
    expectedReleaseSha: expected,
  });
  await writeArtifacts(outputDir, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.accepted) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => { console.error(error.message); process.exit(1); });
}
