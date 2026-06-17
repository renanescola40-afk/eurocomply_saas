#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'restore-tested.json');
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
if (evidence.control !== 'restore-tested') fail('control must be restore-tested');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!Array.isArray(evidence.restoreTests) || evidence.restoreTests.length === 0) fail('restoreTests must include at least one test');
for (const test of evidence.restoreTests) {
  if (!test.testId || !test.system || !test.startedAt || !test.completedAt || !test.rtoTarget || !test.rtoActual || !test.rpoTarget || !test.rpoActual || !test.status || !test.evidenceLocation) fail('each restore test must include testId, system, timestamps, RTO/RPO targets and actuals, status, and evidenceLocation');
  if (evidence.status === 'Complete' && test.status !== 'passed') fail(`${test.testId} must have status passed for Complete evidence`);
}

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 restore test evidence is valid: ${evidencePath}`);
