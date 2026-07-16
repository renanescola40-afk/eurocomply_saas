#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'backup-restore-tested.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const checksumPattern = /^[a-f0-9]{64}$/i;
const requiredControls = [
  'Critical systems are covered',
  'Restore test completed successfully',
  'Restored data integrity was validated',
  'RLS was validated after restore',
  'RTO target was evaluated',
  'RPO target was evaluated',
];

function fail(message) {
  console.error(`P1 restore test evidence check failed: ${message}`);
  process.exit(1);
}

function required(value, field) {
  if (value === undefined || value === null || String(value).trim() === '') fail(`${field} is required`);
}

function requireIsoTimestamp(value, field) {
  required(value, field);
  if (!Number.isFinite(Date.parse(value))) fail(`${field} must be an ISO timestamp`);
}

function requireNumber(value, field, { positive = false } = {}) {
  if (!Number.isFinite(value)) fail(`${field} must be a measured number`);
  if (positive ? value <= 0 : value < 0) fail(`${field} is outside the allowed range`);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 restore test evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.schemaVersion !== 1) fail('schemaVersion must be 1');
if (evidence.controlId !== 'P1-07') fail('controlId must be P1-07');
if (evidence.control !== 'backup-restore-tested') fail('control must be backup-restore-tested');
if (evidence.status !== 'Complete') fail('status must be Complete');
if (evidence.evidenceKind !== 'final-p1-control-evidence') fail('evidenceKind must be final-p1-control-evidence');
if (evidence.generatedFromRealEvidence !== true) fail('generatedFromRealEvidence must be true');
if (evidence.productionValidated !== true) fail('productionValidated must be true');
if (evidence.environment !== 'production') fail('environment must be production');
if (evidence.targetEnvironment !== 'recovery-isolated') fail('targetEnvironment must be recovery-isolated');

for (const field of ['generatedAt', 'reviewedAt', 'reviewer', 'nextReviewDue']) required(evidence[field], field);
for (const field of ['generatedAt', 'reviewedAt', 'nextReviewDue']) requireIsoTimestamp(evidence[field], field);

if (!evidence.validation || typeof evidence.validation !== 'object') fail('validation is required');
if (evidence.validation.result !== 'pass') fail('validation.result must be pass');
for (const field of ['validatedAt', 'validator', 'method']) required(evidence.validation[field], `validation.${field}`);
requireIsoTimestamp(evidence.validation.validatedAt, 'validation.validatedAt');

const generatedAt = Date.parse(evidence.generatedAt);
const validatedAt = Date.parse(evidence.validation.validatedAt);
const reviewedAt = Date.parse(evidence.reviewedAt);
const nextReviewDue = Date.parse(evidence.nextReviewDue);
if (validatedAt < generatedAt) fail('validation.validatedAt precedes generatedAt');
if (reviewedAt < validatedAt) fail('reviewedAt precedes validation.validatedAt');
if (nextReviewDue <= reviewedAt) fail('nextReviewDue must be after reviewedAt');

if (!Array.isArray(evidence.restoreTests) || evidence.restoreTests.length === 0) fail('restoreTests must include at least one test');
for (const test of evidence.restoreTests) {
  for (const field of [
    'testId',
    'system',
    'sourceProjectRef',
    'targetProjectRef',
    'backupId',
    'startedAt',
    'completedAt',
    'status',
    'evidenceLocation',
    'dataIntegrityEvidence',
    'rlsEvidence',
  ]) required(test[field], `restoreTests[].${field}`);

  if (test.sourceProjectRef === test.targetProjectRef) fail(`${test.testId}: sourceProjectRef and targetProjectRef must differ`);
  if (test.status !== 'passed') fail(`${test.testId} must have status passed`);
  if (test.backupEncrypted !== true) fail(`${test.testId}: backupEncrypted must be true`);
  if (!checksumPattern.test(test.backupChecksumSha256 ?? '')) fail(`${test.testId}: backupChecksumSha256 must be a 64 character hex digest`);
  requireIsoTimestamp(test.startedAt, `${test.testId}.startedAt`);
  requireIsoTimestamp(test.completedAt, `${test.testId}.completedAt`);
  if (Date.parse(test.completedAt) < Date.parse(test.startedAt)) fail(`${test.testId}: completedAt precedes startedAt`);
  requireNumber(test.rtoTargetSeconds, `${test.testId}.rtoTargetSeconds`, { positive: true });
  requireNumber(test.rtoActualSeconds, `${test.testId}.rtoActualSeconds`, { positive: true });
  requireNumber(test.rpoTargetSeconds, `${test.testId}.rpoTargetSeconds`);
  requireNumber(test.rpoActualSeconds, `${test.testId}.rpoActualSeconds`);
  if (test.rtoActualSeconds > test.rtoTargetSeconds) fail(`${test.testId}: measured RTO exceeds target`);
  if (test.rpoActualSeconds > test.rpoTargetSeconds) fail(`${test.testId}: measured RPO exceeds target`);
  if (Date.parse(test.completedAt) > generatedAt) fail(`${test.testId}: generatedAt precedes completedAt`);
}

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length === 0) fail('artifacts must include at least one artifact');
for (const artifact of evidence.artifacts) {
  for (const field of ['type', 'reference', 'description', 'collectedAt']) required(artifact[field], `artifacts[].${field}`);
  requireIsoTimestamp(artifact.collectedAt, 'artifacts[].collectedAt');
  if (Date.parse(artifact.collectedAt) > reviewedAt) fail('artifacts[].collectedAt must not be after reviewedAt');
}

console.log(`P1 restore test evidence is valid: ${evidencePath}`);
