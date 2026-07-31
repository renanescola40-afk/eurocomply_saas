#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

export function evaluatePostExecutionAttestation({ controlPlane, controlPlaneBytes, attestation, expectedReleaseSha }) {
  const failures = [];
  const releaseSha = String(expectedReleaseSha ?? '').toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(releaseSha)) failures.push('release_sha_invalid');
  if (controlPlane?.schema !== 'risck-comply.supabase-migration-release-control-plane-result.v1') failures.push('control_plane_schema_invalid');
  if (controlPlane?.releaseSha !== releaseSha) failures.push('control_plane_release_sha_mismatch');
  if (controlPlane?.status !== 'READY_FOR_SEPARATE_MANUAL_PRODUCTION_WORKFLOW') failures.push('control_plane_not_ready');
  if (controlPlane?.authorization?.productionWriteAuthorizedByThisArtifact !== false) failures.push('control_plane_safety_boundary_invalid');

  if (attestation?.schema !== 'risck-comply.supabase-migration-post-execution-attestation.v1') failures.push('attestation_schema_invalid');
  if (attestation?.releaseSha !== releaseSha) failures.push('attestation_release_sha_mismatch');
  if (attestation?.controlPlaneSha256 !== sha256(controlPlaneBytes)) failures.push('attestation_control_plane_digest_mismatch');
  if (attestation?.status !== 'COMPLETED') failures.push('attestation_not_completed');
  if (attestation?.automaticExecutionUsed !== false) failures.push('automatic_execution_must_be_false');

  const required = [
    'productionWorkflowRunReference',
    'backupOrPitrReference',
    'migrationHistoryBeforeReference',
    'migrationHistoryAfterReference',
    'schemaVerificationReference',
    'rlsTenantIsolationReference',
    'authenticatedSmokeReference',
    'observabilityReviewReference',
    'operator',
    'independentApprover',
    'completedAt',
  ];
  for (const key of required) if (!nonEmpty(attestation?.[key])) failures.push(`${key}_required`);
  if (nonEmpty(attestation?.operator) && attestation.operator === attestation.independentApprover) failures.push('operator_and_approver_must_differ');

  const batches = Array.isArray(attestation?.batches) ? attestation.batches : [];
  if (batches.length !== controlPlane?.batchCount) failures.push('batch_count_mismatch');
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const prefix = `batch_${index + 1}`;
    if (batch?.batchNumber !== index + 1) failures.push(`${prefix}_number_invalid`);
    if (batch?.status !== 'PASSED') failures.push(`${prefix}_not_passed`);
    for (const key of ['executionLogReference', 'schemaCheckReference', 'historyCheckReference', 'rlsCheckReference', 'smokeCheckReference']) {
      if (!nonEmpty(batch?.[key])) failures.push(`${prefix}_${key}_required`);
    }
    if (batch?.rollbackTriggered === true && !nonEmpty(batch?.rollbackEvidenceReference)) failures.push(`${prefix}_rollback_evidence_required`);
  }

  const accepted = failures.length === 0;
  return {
    schema: 'risck-comply.supabase-migration-post-execution-result.v1',
    generatedAt: new Date().toISOString(),
    releaseSha,
    status: accepted ? 'POST_EXECUTION_EVIDENCE_ACCEPTED' : 'BLOCKED',
    accepted,
    failures: [...new Set(failures)],
    productionExecutionCredited: accepted,
    enterpriseGateCreditEligible: accepted,
    safety: {
      databaseModifiedByValidator: false,
      sqlExecutedByValidator: false,
      evidenceOnly: true,
    },
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const [controlPath, attestationPath, outputDir = 'artifacts/supabase-migration-post-execution'] = positional;
  const expected = args.find((arg) => arg.startsWith('--expected-sha='))?.split('=')[1] ?? process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  if (!controlPath || !attestationPath) throw new Error('usage: control-plane-result.json attestation.json [output-dir] --expected-sha=<sha>');
  const controlPlaneBytes = await readFile(controlPath);
  const controlPlane = JSON.parse(controlPlaneBytes.toString('utf8'));
  const attestation = JSON.parse(await readFile(attestationPath, 'utf8'));
  const result = evaluatePostExecutionAttestation({ controlPlane, controlPlaneBytes, attestation, expectedReleaseSha: expected });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'post-execution-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (!result.accepted) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => { console.error(error.message); process.exit(1); });
}
