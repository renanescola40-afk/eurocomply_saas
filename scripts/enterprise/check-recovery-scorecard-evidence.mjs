#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const expectedSha = String(process.env.ENTERPRISE_EXPECTED_SHA || '').trim().toLowerCase();
const expectedRepository = 'renanescola40-afk/eurocomply_saas';
const failures = [];
const documents = [
  {
    label: 'rollback',
    path: 'docs/security/evidence/runtime/rollback-validation.json',
    schema: 'risck-comply.rollback-scorecard-evidence.v1',
    item: 'rollback-validation',
    controls: ['REC-01', 'REC-02', 'REC-03', 'REC-04'],
    checks: ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth'],
  },
  {
    label: 'restore',
    path: 'docs/security/evidence/p1/backup-restore-tested.json',
    schema: 'risck-comply.backup-restore-scorecard-evidence.v1',
    item: 'backup-restore-tested',
    controls: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'],
    checks: ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured'],
  },
];

if (!/^[a-f0-9]{40}$/.test(expectedSha)) failures.push('ENTERPRISE_EXPECTED_SHA must be a full SHA');

let sharedRunId = null;
for (const contract of documents) {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(contract.path, 'utf8'));
  } catch {
    failures.push(`${contract.label} evidence is missing or invalid JSON`);
    continue;
  }
  if (evidence.schema !== contract.schema) failures.push(`${contract.label} schema is invalid`);
  if (evidence.evidenceItem !== contract.item) failures.push(`${contract.label} evidence item is invalid`);
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push(`${contract.label} is not Complete/passed`);
  if (evidence.repository !== expectedRepository || evidence.branch !== 'main') failures.push(`${contract.label} provenance is invalid`);
  if (evidence.targetSha !== expectedSha || evidence.observedSha !== expectedSha) failures.push(`${contract.label} exact SHA is invalid`);
  if (!/^\d+$/.test(String(evidence.runId || ''))) failures.push(`${contract.label} run ID is invalid`);
  if (sharedRunId === null) sharedRunId = String(evidence.runId || '');
  else if (String(evidence.runId || '') !== sharedRunId) failures.push('recovery documents use different run IDs');
  if (JSON.stringify(evidence.controlsVerified) !== JSON.stringify(contract.controls)) failures.push(`${contract.label} controls are invalid`);
  for (const name of contract.checks) {
    const matches = Array.isArray(evidence.checks) ? evidence.checks.filter((check) => check?.name === name) : [];
    if (matches.length !== 1 || matches[0]?.passed !== true) failures.push(`${contract.label} check ${name} must pass exactly once`);
  }
  if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${contract.label} sensitive integrity is invalid`);
  if (evidence.evidenceIntegrity?.credentialsStored !== false) failures.push(`${contract.label} credential integrity is invalid`);
  if (evidence.evidenceIntegrity?.exactShaBound !== true || evidence.evidenceIntegrity?.sourceRunBound !== true) failures.push(`${contract.label} binding integrity is invalid`);
  if (evidence.sourceWorkflow?.name !== 'Recovery Resilience Proof' || evidence.sourceWorkflow?.runId !== String(evidence.runId)) failures.push(`${contract.label} workflow provenance is invalid`);
}

if (failures.length) {
  console.error('Recovery scorecard evidence validation failed:');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Recovery scorecard evidence validation passed for ${expectedSha}.`);
