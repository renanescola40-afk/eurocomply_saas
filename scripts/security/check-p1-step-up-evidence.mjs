#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'step-up-sensitive-actions.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const requiredActions = new Set(['billing', 'exports', 'team-management', 'gdpr-delete']);
const requiredControls = [
  'Sensitive actions require step-up authentication',
  'Step-up state expires and cannot be reused indefinitely',
  'Authorization is rechecked after step-up',
  'Audit event is emitted for sensitive actions',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`P1 step-up evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 step-up evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'step-up-sensitive-actions') fail('control must be step-up-sensitive-actions');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!Array.isArray(evidence.sensitiveActionsReviewed)) fail('sensitiveActionsReviewed must be an array');
const actions = new Map(evidence.sensitiveActionsReviewed.map((entry) => [entry.action, entry]));
for (const action of requiredActions) {
  if (!actions.has(action)) fail(`missing sensitive action: ${action}`);
  const entry = actions.get(action);
  if (!entry.routeOrOperation || !entry.stepUpMethod || !entry.status || !entry.evidenceLocation) fail(`${action} must include routeOrOperation, stepUpMethod, status, and evidenceLocation`);
  if (evidence.status === 'Complete' && entry.status !== 'enforced') fail(`${action} must have status enforced for Complete evidence`);
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

console.log(`P1 step-up evidence is valid: ${evidencePath}`);
