#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const rollbackPath = 'docs/security/evidence/runtime/rollback-validation.json';
const restorePath = 'docs/security/evidence/p1/backup-restore-tested.json';
const failures = [];
const fullSha = /^[a-f0-9]{40}$/;
const mode = String(process.env.RECOVERY_REQUIRED_EXERCISE || 'full').trim();
if (!['full', 'backup-restore', 'production-rollback'].includes(mode)) failures.push('RECOVERY_REQUIRED_EXERCISE is invalid');
function read(path, required) {
  try { const raw = readFileSync(path); if (raw.byteLength === 0 || raw.byteLength > 2 * 1024 * 1024) { failures.push(`${path} has an invalid size`); return null; } return JSON.parse(raw.toString('utf8')); }
  catch (error) { if (error && typeof error === 'object' && error.code === 'ENOENT' && !required) return null; failures.push(error && typeof error === 'object' && error.code === 'ENOENT' ? `${path} is missing` : `${path} is not valid JSON`); return null; }
}
function require(condition, message) { if (!condition) failures.push(message); }
const requireRollback = mode === 'full' || mode === 'production-rollback';
const requireRestore = mode === 'full' || mode === 'backup-restore';
const rollback = read(rollbackPath, requireRollback);
const restore = read(restorePath, requireRestore);
if (rollback) {
  require(rollback.schema === 'risck-comply.rollback-validation.v4', 'rollback schema is invalid');
  require(rollback.evidenceItem === 'rollback-validation', 'rollback evidenceItem is invalid');
  require(rollback.status === 'Complete' && rollback.outcome === 'passed', 'rollback evidence must be Complete/passed');
  require(fullSha.test(String(rollback.targetSha ?? '')), 'rollback targetSha must be exact');
  require(rollback.observedSha === rollback.targetSha, 'rollback observedSha must match targetSha');
  require(/^\d+$/.test(String(rollback.runId ?? '')), 'rollback runId must be numeric');
  require(String(rollback.repository ?? '').includes('/'), 'rollback repository provenance is missing');
  require(JSON.stringify(rollback.controlsVerified) === JSON.stringify(['REC-01', 'REC-02', 'REC-03', 'REC-04']), 'rollback controlsVerified is invalid');
  for (const check of ['explicitConfirmation','rollbackTargetConfigured','rollbackTargetDistinct','rollbackShaDistinct','rollbackExecuted','rollbackStatusChecked','postRollbackHealth','postRollbackNoStore','exactShaBound']) require(rollback.checks?.[check] === true, `rollback check ${check} must pass`);
  require(rollback.evidenceIntegrity?.containsSensitiveValues === false, 'rollback sensitive-value assertion is missing');
  require(rollback.evidenceIntegrity?.credentialsStored === false, 'rollback evidence stores credentials');
  require(rollback.evidenceIntegrity?.deploymentUrlsStored === false, 'rollback evidence stores deployment URLs');
  require(Array.isArray(rollback.failures) && rollback.failures.length === 0, 'rollback evidence contains failures');
}
if (restore) {
  require(restore.schema === 'risck-comply.backup-restore-evidence.v2', 'restore schema is invalid');
  require(restore.evidenceItem === 'backup-restore-tested', 'restore evidenceItem is invalid');
  require(restore.status === 'Complete' && restore.outcome === 'passed', 'restore evidence must be Complete/passed');
  require(fullSha.test(String(restore.targetSha ?? '')), 'restore targetSha must be exact');
  require(restore.observedSha === restore.targetSha, 'restore observedSha must match targetSha');
  require(/^\d+$/.test(String(restore.runId ?? '')), 'restore runId must be numeric');
  require(String(restore.repository ?? '').includes('/'), 'restore repository provenance is missing');
  require(JSON.stringify(restore.controlsVerified) === JSON.stringify(['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10']), 'restore controlsVerified is invalid');
  for (const check of ['backupExists','restoreExecuted','dataIntegrity','rlsAfterRestore','rlsPoliciesPresent','rpoMeasured','rtoMeasured','distinctDatabases','protectedMainExecution','exactShaBound']) require(restore.checks?.[check] === true, `restore check ${check} must pass`);
  require(Number.isFinite(restore.metrics?.rpoSeconds), 'RPO must be numeric');
  require(Number.isFinite(restore.metrics?.rtoSeconds), 'RTO must be numeric');
  require(restore.evidenceIntegrity?.containsSensitiveValues === false, 'restore sensitive-value assertion is missing');
  require(restore.evidenceIntegrity?.databaseUrlsStored === false, 'restore evidence stores database URLs');
  require(restore.evidenceIntegrity?.dumpStored === false, 'restore evidence stores the dump');
  require(restore.evidenceIntegrity?.rowDataStored === false, 'restore evidence stores row data');
  require(Array.isArray(restore.failures) && restore.failures.length === 0, 'restore evidence contains failures');
}
if (rollback && restore) {
  require(rollback.targetSha === restore.targetSha, 'recovery evidence target SHA mismatch');
  require(rollback.observedSha === restore.observedSha, 'recovery evidence observed SHA mismatch');
  require(rollback.runId === restore.runId, 'recovery evidence run ID mismatch');
  require(rollback.repository === restore.repository, 'recovery evidence repository mismatch');
}
if (failures.length) { console.error('Recovery evidence validation failed:'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Recovery evidence validation passed for ${mode}.`);
