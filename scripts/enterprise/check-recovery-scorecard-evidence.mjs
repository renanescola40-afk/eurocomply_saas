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
    workflowName: 'Recovery Resilience Proof',
    workflowFile: '.github/workflows/recovery-resilience-proof.yml',
  },
  {
    label: 'restore',
    path: 'docs/security/evidence/p1/backup-restore-tested.json',
    schema: 'risck-comply.backup-restore-scorecard-evidence.v1',
    item: 'backup-restore-tested',
    controls: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'],
    checks: ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured'],
    workflowName: 'Supabase Forward Reconciliation Rehearsal',
    workflowFile: '.github/workflows/supabase-forward-reconciliation-rehearsal.yml',
  },
];

if (!/^[a-f0-9]{40}$/.test(expectedSha)) failures.push('ENTERPRISE_EXPECTED_SHA must be a full SHA');

const loaded = new Map();
for (const contract of documents) {
  try {
    loaded.set(contract.label, JSON.parse(readFileSync(contract.path, 'utf8')));
  } catch {
    failures.push(`${contract.label} evidence is missing or invalid JSON`);
  }
}

let executedCount = 0;
const modes = [];
for (const contract of documents) {
  const evidence = loaded.get(contract.label);
  if (!evidence) continue;

  if (evidence.schema !== contract.schema) failures.push(`${contract.label} schema is invalid`);
  if (evidence.evidenceItem !== contract.item) failures.push(`${contract.label} evidence item is invalid`);
  if (evidence.repository !== expectedRepository || evidence.branch !== 'main') failures.push(`${contract.label} provenance is invalid`);
  if (evidence.targetSha !== expectedSha || evidence.observedSha !== expectedSha) failures.push(`${contract.label} exact SHA is invalid`);
  if (JSON.stringify(evidence.controlsVerified) !== JSON.stringify(contract.controls)) failures.push(`${contract.label} controls are invalid`);

  const complete = evidence.status === 'Complete' && evidence.outcome === 'passed';
  const notExecuted = evidence.status === 'Open' && evidence.outcome === 'not_executed';
  if (!complete && !notExecuted) failures.push(`${contract.label} status/outcome is invalid`);

  if (complete) {
    executedCount += 1;
    modes.push(contract.label);
    if (!/^\d+$/.test(String(evidence.runId || ''))) failures.push(`${contract.label} run ID is invalid`);
    if (evidence.evidenceIntegrity?.sourceRunBound !== true) failures.push(`${contract.label} source-run binding is invalid`);
  } else {
    if (evidence.runId !== null) failures.push(`${contract.label} non-executed run ID must be null`);
    if (evidence.evidenceIntegrity?.sourceRunBound !== false) failures.push(`${contract.label} non-executed source-run binding must be false`);
  }

  for (const name of contract.checks) {
    const matches = Array.isArray(evidence.checks) ? evidence.checks.filter((check) => check?.name === name) : [];
    if (matches.length !== 1 || matches[0]?.passed !== complete) {
      failures.push(`${contract.label} check ${name} must be ${complete ? 'passed' : 'unverified'} exactly once`);
    }
  }

  if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${contract.label} sensitive integrity is invalid`);
  if (evidence.evidenceIntegrity?.credentialsStored !== false) failures.push(`${contract.label} credential integrity is invalid`);
  if (evidence.evidenceIntegrity?.exactShaBound !== true) failures.push(`${contract.label} SHA binding integrity is invalid`);

  if (evidence.sourceWorkflow?.name !== contract.workflowName
    || evidence.sourceWorkflow?.file !== contract.workflowFile) {
    failures.push(`${contract.label} workflow provenance is invalid`);
  }
  if (complete && evidence.sourceWorkflow?.runId !== String(evidence.runId)) {
    failures.push(`${contract.label} workflow run provenance is invalid`);
  }
  if (notExecuted && evidence.sourceWorkflow?.runId !== null) {
    failures.push(`${contract.label} non-executed workflow run ID must be null`);
  }
}

if (executedCount === 0) failures.push('at least one recovery proof must be Complete/passed');

if (failures.length) {
  console.error('Recovery scorecard evidence validation failed:');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

const mode = executedCount === 2 ? 'full' : `${modes[0]}-only`;
console.log(`Recovery scorecard evidence validation passed for ${expectedSha} (${mode}).`);
