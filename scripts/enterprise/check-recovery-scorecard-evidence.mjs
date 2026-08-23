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

const loaded = new Map();
for (const contract of documents) {
  try {
    loaded.set(contract.label, JSON.parse(readFileSync(contract.path, 'utf8')));
  } catch {
    failures.push(`${contract.label} evidence is missing or invalid JSON`);
  }
}

const rollback = loaded.get('rollback');
const restore = loaded.get('restore');
const restoreOnly = rollback?.status === 'Open'
  && rollback?.outcome === 'not_executed'
  && rollback?.sourceWorkflow?.name === 'Enterprise Recovery Drill'
  && restore?.sourceWorkflow?.name === 'Enterprise Recovery Drill';

let sharedRunId = null;
for (const contract of documents) {
  const evidence = loaded.get(contract.label);
  if (!evidence) continue;

  if (evidence.schema !== contract.schema) failures.push(`${contract.label} schema is invalid`);
  if (evidence.evidenceItem !== contract.item) failures.push(`${contract.label} evidence item is invalid`);

  if (contract.label === 'rollback' && restoreOnly) {
    if (evidence.status !== 'Open' || evidence.outcome !== 'not_executed') failures.push('rollback restore-only status is invalid');
  } else if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') {
    failures.push(`${contract.label} is not Complete/passed`);
  }

  if (evidence.repository !== expectedRepository || evidence.branch !== 'main') failures.push(`${contract.label} provenance is invalid`);
  if (evidence.targetSha !== expectedSha || evidence.observedSha !== expectedSha) failures.push(`${contract.label} exact SHA is invalid`);
  if (!/^\d+$/.test(String(evidence.runId || ''))) failures.push(`${contract.label} run ID is invalid`);
  if (sharedRunId === null) sharedRunId = String(evidence.runId || '');
  else if (String(evidence.runId || '') !== sharedRunId) failures.push('recovery documents use different run IDs');
  if (JSON.stringify(evidence.controlsVerified) !== JSON.stringify(contract.controls)) failures.push(`${contract.label} controls are invalid`);

  for (const name of contract.checks) {
    const matches = Array.isArray(evidence.checks) ? evidence.checks.filter((check) => check?.name === name) : [];
    const expectedPassed = contract.label === 'rollback' && restoreOnly ? false : true;
    if (matches.length !== 1 || matches[0]?.passed !== expectedPassed) {
      failures.push(`${contract.label} check ${name} must be ${expectedPassed ? 'passed' : 'unverified'} exactly once`);
    }
  }

  if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${contract.label} sensitive integrity is invalid`);
  if (evidence.evidenceIntegrity?.credentialsStored !== false) failures.push(`${contract.label} credential integrity is invalid`);
  if (evidence.evidenceIntegrity?.exactShaBound !== true || evidence.evidenceIntegrity?.sourceRunBound !== true) failures.push(`${contract.label} binding integrity is invalid`);

  const expectedWorkflowName = restoreOnly ? 'Enterprise Recovery Drill' : 'Recovery Resilience Proof';
  const expectedWorkflowFile = restoreOnly
    ? '.github/workflows/enterprise-recovery-drill.yml'
    : '.github/workflows/recovery-resilience-proof.yml';
  if (evidence.sourceWorkflow?.name !== expectedWorkflowName
    || evidence.sourceWorkflow?.file !== expectedWorkflowFile
    || evidence.sourceWorkflow?.runId !== String(evidence.runId)) {
    failures.push(`${contract.label} workflow provenance is invalid`);
  }
}

if (restoreOnly) {
  if (restore?.status !== 'Complete' || restore?.outcome !== 'passed') failures.push('restore-only recovery evidence must contain a Complete/passed restore');
  if (rollback?.metrics?.recoveryTimeSeconds !== null) failures.push('restore-only rollback metrics must remain null');
}

if (failures.length) {
  console.error('Recovery scorecard evidence validation failed:');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Recovery scorecard evidence validation passed for ${expectedSha}${restoreOnly ? ' (restore-only)' : ''}.`);
