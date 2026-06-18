#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'backup-restore-tested.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'backup-restore-tested.json');

const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Critical systems are covered',
  'Restore test completed successfully',
  'RTO target was evaluated',
  'RPO target was evaluated',
];

function fail(message) {
  console.error(`[p1-restore-builder] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(inputPath)) {
  fail(`input file is required: ${inputPath}`);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${inputPath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(input))) {
  fail('input must not contain placeholder values');
}

if (!['Complete', 'Exception'].includes(input.status)) {
  fail('status must be Complete or Exception');
}

assertString(input.reviewedAt, 'reviewedAt');
assertString(input.reviewer, 'reviewer');
assertString(input.targetEnvironment, 'targetEnvironment');

if (!Array.isArray(input.restoreTests) || input.restoreTests.length === 0) {
  fail('restoreTests must include at least one test');
}

for (const [index, test] of input.restoreTests.entries()) {
  for (const field of ['testId', 'system', 'startedAt', 'completedAt', 'rtoTarget', 'rtoActual', 'rpoTarget', 'rpoActual', 'status', 'evidenceLocation']) {
    assertString(test[field], `restoreTests[${index}].${field}`);
  }
  if (input.status === 'Complete' && test.status !== 'passed') {
    fail(`${test.testId} must have status passed for Complete evidence`);
  }
}

if (!Array.isArray(input.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!hasControl(input.controlsVerified, control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'backup-restore-tested',
  status: input.status,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  restoreTests: input.restoreTests,
  controlsVerified: input.controlsVerified,
  nextReviewDue: input.nextReviewDue,
};

if (input.status === 'Exception') {
  if (!input.exception || typeof input.exception !== 'object') {
    fail('Exception status requires exception object');
  }
  for (const field of ['riskOwner', 'rationale', 'expiresAt', 'approvalReference']) {
    assertString(input.exception[field], `exception.${field}`);
  }
  if (!Array.isArray(input.exception.compensatingControls) || input.exception.compensatingControls.length === 0) {
    fail('exception.compensatingControls must be a non-empty array');
  }
  evidence.exception = input.exception;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`[p1-restore-builder] wrote ${outputPath}`);
