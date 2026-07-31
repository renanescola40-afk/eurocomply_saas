#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/i;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const digest = (value) => createHash('sha256').update(value).digest('hex');

function unique(values) {
  return [...new Set(values)];
}

function requireEvidence(value, key, failures) {
  if (!nonEmpty(value)) failures.push(`${key}_required`);
}

function validateBatch(batch, index, seenOrders, failures) {
  const prefix = `batch_${index + 1}`;
  if (!Number.isInteger(batch?.batchNumber) || batch.batchNumber !== index + 1) {
    failures.push(`${prefix}_number_invalid`);
  }
  if (!Array.isArray(batch?.items) || batch.items.length === 0 || batch.items.length > 25) {
    failures.push(`${prefix}_size_invalid`);
    return;
  }
  requireEvidence(batch.stagingEvidenceReference, `${prefix}_staging_evidence`, failures);
  requireEvidence(batch.rollbackEvidenceReference, `${prefix}_rollback_evidence`, failures);
  requireEvidence(batch.preBatchSnapshotReference, `${prefix}_pre_batch_snapshot`, failures);
  for (const item of batch.items) {
    if (!nonEmpty(item?.filename) || !/^[a-f0-9]{64}$/i.test(String(item?.sha256 ?? ''))) {
      failures.push(`${prefix}_item_identity_invalid`);
    }
    if (!Number.isInteger(item?.deployOrderDecision) || item.deployOrderDecision < 1) {
      failures.push(`${prefix}_deploy_order_invalid`);
    } else if (seenOrders.has(item.deployOrderDecision)) {
      failures.push(`duplicate_deploy_order_${item.deployOrderDecision}`);
    } else {
      seenOrders.add(item.deployOrderDecision);
    }
    requireEvidence(item.stagedExecutionEvidenceReference, `${prefix}_${item.filename}_staging`, failures);
    requireEvidence(item.rollbackReference, `${prefix}_${item.filename}_rollback`, failures);
  }
}

export function evaluateReleaseControlPlane({ executionPlan, executionPlanBytes, rehearsal, authorization, expectedReleaseSha }) {
  const failures = [];
  const blockers = [];
  const releaseSha = String(expectedReleaseSha ?? '').toLowerCase();

  if (!SHA.test(releaseSha)) failures.push('expected_release_sha_invalid');
  if (executionPlan?.schema !== 'risck-comply.supabase-migration-execution-plan.v1') failures.push('execution_plan_schema_invalid');
  if (executionPlan?.releaseSha !== releaseSha) failures.push('execution_plan_release_sha_mismatch');
  if (executionPlan?.decisionStatus !== 'RECONCILIATION_ACCEPTED') blockers.push('reconciliation_not_accepted');
  if (executionPlan?.dryRunAuthorized !== false || executionPlan?.productionWriteAuthorized !== false) {
    failures.push('execution_plan_must_be_non_authorizing');
  }

  const batches = Array.isArray(executionPlan?.deploymentBatches) ? executionPlan.deploymentBatches : [];
  const seenOrders = new Set();
  batches.forEach((batch, index) => validateBatch(batch, index, seenOrders, failures));

  const planSha256 = digest(executionPlanBytes);
  if (rehearsal?.schema !== 'risck-comply.supabase-migration-staging-rehearsal.v1') failures.push('rehearsal_schema_invalid');
  if (rehearsal?.releaseSha !== releaseSha) failures.push('rehearsal_release_sha_mismatch');
  if (rehearsal?.executionPlanSha256 !== planSha256) failures.push('rehearsal_plan_digest_mismatch');
  if (rehearsal?.status !== 'PASSED') blockers.push('staging_rehearsal_not_passed');
  if (rehearsal?.productionDatabaseUsed !== false) failures.push('rehearsal_must_not_use_production_database');
  if (rehearsal?.allBatchesPassed !== true) blockers.push('not_all_batches_rehearsed');
  requireEvidence(rehearsal?.stagingCloneReference, 'staging_clone_reference', failures);
  requireEvidence(rehearsal?.dryRunOutputReference, 'dry_run_output_reference', failures);
  requireEvidence(rehearsal?.rlsValidationReference, 'rls_validation_reference', failures);
  requireEvidence(rehearsal?.applicationSmokeReference, 'application_smoke_reference', failures);
  requireEvidence(rehearsal?.rollbackRehearsalReference, 'rollback_rehearsal_reference', failures);

  if (authorization?.schema !== 'risck-comply.supabase-migration-production-authorization.v1') failures.push('authorization_schema_invalid');
  if (authorization?.releaseSha !== releaseSha) failures.push('authorization_release_sha_mismatch');
  if (authorization?.executionPlanSha256 !== planSha256) failures.push('authorization_plan_digest_mismatch');
  if (authorization?.rehearsalSha256 !== digest(Buffer.from(JSON.stringify(rehearsal)))) failures.push('authorization_rehearsal_digest_mismatch');
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
  return {
    schema: 'risck-comply.supabase-migration-release-control-plane-result.v1',
    generatedAt: new Date().toISOString(),
    releaseSha,
    executionPlanSha256: planSha256,
    status: accepted ? 'READY_FOR_SEPARATE_MANUAL_PRODUCTION_WORKFLOW' : 'BLOCKED',
    accepted,
    failures: unique(failures),
    blockers: unique(blockers),
    batchCount: batches.length,
    migrationCount: batches.reduce((sum, batch) => sum + (Array.isArray(batch.items) ? batch.items.length : 0), 0),
    authorization: {
      dryRunEvidenceAccepted: accepted,
      stagingRehearsalAccepted: accepted,
      productionWorkflowMayBeRequested: accepted,
      productionWriteAuthorizedByThisArtifact: false,
      automaticExecutionAllowed: false,
    },
    mandatoryProductionSequence: [
      'verify exact current main SHA',
      'verify retained artifact digests',
      'confirm backup or PITR restore point',
      'execute history repair separately when approved',
      'execute one deployment batch at a time',
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
      note: 'This control-plane artifact only validates prerequisites. Production execution requires a distinct protected manual workflow and fresh environment approval.',
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
  if (!planPath || !rehearsalPath || !authorizationPath) throw new Error('usage: execution-plan.json rehearsal.json authorization.json [output-dir] --expected-sha=<sha>');
  const executionPlanBytes = await readFile(planPath);
  const executionPlan = JSON.parse(executionPlanBytes.toString('utf8'));
  const rehearsal = JSON.parse(await readFile(rehearsalPath, 'utf8'));
  const authorization = JSON.parse(await readFile(authorizationPath, 'utf8'));
  const result = evaluateReleaseControlPlane({ executionPlan, executionPlanBytes, rehearsal, authorization, expectedReleaseSha: expected });
  await writeArtifacts(outputDir, result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.accepted) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => { console.error(error.message); process.exit(1); });
}
