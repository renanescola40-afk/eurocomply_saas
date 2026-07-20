#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const rollbackPath = 'docs/security/evidence/runtime/rollback-validation.json';
const restorePath = 'docs/security/evidence/p1/backup-restore-tested.json';
const failures = [];
const fullSha = /^[a-f0-9]{40}$/i;

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return null;
  }
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { failures.push(`${path} is not valid JSON`); return null; }
}

function require(condition, message) {
  if (!condition) failures.push(message);
}

const rollback = read(rollbackPath);
if (rollback) {
  require(rollback.schema === 'risck-comply.rollback-validation.v3', 'rollback schema is invalid');
  require(rollback.evidenceItem === 'rollback-validation', 'rollback evidenceItem is invalid');
  require(rollback.status === 'Complete' && rollback.outcome === 'passed', 'rollback evidence must be Complete/passed');
  require(fullSha.test(String(rollback.targetSha ?? '')), 'rollback targetSha must be exact');
  require(rollback.checks?.explicitConfirmation === true, 'rollback confirmation is missing');
  require(rollback.checks?.rollbackTargetConfigured === true, 'rollback target is missing');
  require(rollback.checks?.rollbackTargetDistinct === true, 'rollback target must differ');
  require(rollback.checks?.rollbackShaDistinct === true, 'rollback SHA must differ');
  require(rollback.checks?.rollbackExecuted === true, 'rollback was not executed');
  require(rollback.checks?.rollbackStatusChecked === true, 'rollback status was not checked');
  require(rollback.checks?.postRollbackHealth === true, 'post-rollback health failed');
  require(rollback.checks?.postRollbackNoStore === true, 'post-rollback no-store failed');
  require(rollback.evidenceIntegrity?.credentialsStored === false, 'rollback evidence stores credentials');
  require(rollback.evidenceIntegrity?.deploymentUrlsStored === false, 'rollback evidence stores deployment URLs');
  require(Array.isArray(rollback.failures) && rollback.failures.length === 0, 'rollback evidence contains failures');
}

const restore = read(restorePath);
if (restore) {
  require(restore.schema === 'risck-comply.backup-restore-evidence.v1', 'restore schema is invalid');
  require(restore.evidenceItem === 'backup-restore-tested', 'restore evidenceItem is invalid');
  require(restore.status === 'Complete' && restore.outcome === 'passed', 'restore evidence must be Complete/passed');
  require(fullSha.test(String(restore.targetSha ?? '')), 'restore targetSha must be exact');
  for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rlsPoliciesPresent', 'rpoMeasured', 'rtoMeasured', 'distinctDatabases', 'protectedMainExecution', 'exactShaBound']) {
    require(restore.checks?.[check] === true, `restore check ${check} must pass`);
  }
  require(Number.isFinite(restore.metrics?.rpoSeconds), 'RPO must be numeric');
  require(Number.isFinite(restore.metrics?.rtoSeconds), 'RTO must be numeric');
  require(restore.evidenceIntegrity?.databaseUrlsStored === false, 'restore evidence stores database URLs');
  require(restore.evidenceIntegrity?.dumpStored === false, 'restore evidence stores the dump');
  require(restore.evidenceIntegrity?.rowDataStored === false, 'restore evidence stores row data');
  require(Array.isArray(restore.failures) && restore.failures.length === 0, 'restore evidence contains failures');
}

if (failures.length) {
  console.error('Recovery evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Recovery evidence validation passed.');
