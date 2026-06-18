#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'dast-automated.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'dast-automated.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'DAST runs automatically or on demand in CI',
  'Production-like target is scanned',
  'Critical and high findings block completion',
  'Findings are triaged with durable references',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-dast-builder] ${message}`);
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

if (!input.scanner || typeof input.scanner !== 'object') {
  fail('scanner is required');
}
for (const field of ['name', 'version', 'profile', 'evidenceLocation']) {
  assertString(input.scanner[field], `scanner.${field}`);
}

if (!Array.isArray(input.targetsReviewed) || input.targetsReviewed.length === 0) {
  fail('targetsReviewed must include at least one target');
}
for (const [index, target] of input.targetsReviewed.entries()) {
  assertString(target.target, `targetsReviewed[${index}].target`);
  assertString(target.environment, `targetsReviewed[${index}].environment`);
  assertString(target.status, `targetsReviewed[${index}].status`);
  assertString(target.evidenceLocation, `targetsReviewed[${index}].evidenceLocation`);
  if (input.status === 'Complete' && target.status !== 'scanned') {
    fail(`${target.target} must have status scanned for Complete evidence`);
  }
}

if (!input.findingsSummary || typeof input.findingsSummary.critical !== 'number' || typeof input.findingsSummary.high !== 'number') {
  fail('findingsSummary must include numeric critical and high counts');
}
if (input.status === 'Complete' && (input.findingsSummary.critical > 0 || input.findingsSummary.high > 0)) {
  fail('Complete evidence cannot have open critical or high DAST findings');
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
  control: 'dast-automated',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  scanner: input.scanner,
  targetsReviewed: input.targetsReviewed,
  findingsSummary: input.findingsSummary,
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
console.log(`[p1-dast-builder] wrote ${outputPath}`);
