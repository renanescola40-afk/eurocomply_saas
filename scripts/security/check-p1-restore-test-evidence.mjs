#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'backup-restore-tested.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Critical systems are covered',
  'Restore test completed successfully',
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

for (const field of ['generatedAt', 'reviewedAt', 'reviewer', 'nextReviewDue', 'environment']) required(evidence[field], field);

if (!evidence.validation || typeof evidence.validation !== 'object') fail('validation is required');
if (evidence.validation.result !== 'pass') fail('validation.result must be pass');
for (const field of ['validatedAt', 'validator', 'method']) required(evidence.validation[field], `validation.${field}`);

if (!Array.isArray(evidence.restoreTests) || evidence.restoreTests.length === 0) fail('restoreTests must include at least one test');
for (const test of evidence.restoreTests) {
  for (const field of ['testId', 'system', 'startedAt', 'completedAt', 'rtoTarget', 'rtoActual', 'rpoTarget', 'rpoActual', 'status', 'evidenceLocation']) required(test[field], `restoreTests[].${field}`);
  if (test.status !== 'passed') fail(`${test.testId} must have status passed`);
}

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length === 0) fail('artifacts must include at least one artifact');
for (const artifact of evidence.artifacts) {
  for (const field of ['type', 'reference', 'description', 'collectedAt']) required(artifact[field], `artifacts[].${field}`);
}

console.log(`P1 restore test evidence is valid: ${evidencePath}`);
