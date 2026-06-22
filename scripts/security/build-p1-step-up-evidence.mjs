#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'step-up-sensitive-actions.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'step-up-sensitive-actions.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredActions = new Set(['billing', 'exports', 'team-management', 'gdpr-delete']);
const requiredControls = [
  'Sensitive actions require step-up authentication',
  'Step-up state expires and cannot be reused indefinitely',
  'Authorization is rechecked after step-up',
  'Audit event is emitted for sensitive actions',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-step-up-builder] ${message}`);
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

if (!Array.isArray(input.sensitiveActionsReviewed)) {
  fail('sensitiveActionsReviewed must be an array');
}

const actions = new Map(input.sensitiveActionsReviewed.map((entry) => [entry.action, entry]));
for (const action of requiredActions) {
  if (!actions.has(action)) fail(`missing sensitive action: ${action}`);
  const entry = actions.get(action);
  assertString(entry.routeOrOperation, `${action}.routeOrOperation`);
  assertString(entry.stepUpMethod, `${action}.stepUpMethod`);
  assertString(entry.status, `${action}.status`);
  assertString(entry.evidenceLocation, `${action}.evidenceLocation`);
  if (input.status === 'Complete' && entry.status !== 'enforced') {
    fail(`${action} must have status enforced for Complete evidence`);
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
  control: 'step-up-sensitive-actions',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  sensitiveActionsReviewed: input.sensitiveActionsReviewed,
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
console.log(`[p1-step-up-builder] wrote ${outputPath}`);
