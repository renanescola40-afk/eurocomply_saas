#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'distributed-rate-limit-sensitive-endpoints.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'distributed-rate-limit-sensitive-endpoints.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Rate limit state is shared across instances',
  'Sensitive endpoints have explicit policies',
  'Bypass paths are documented or blocked',
  'Alerting exists for sustained throttling or abuse',
  'Evidence contains no secrets',
];
const requiredCompleteCategories = ['auth', 'billing', 'documents', 'team', 'audit'];

function fail(message) {
  console.error(`[p1-rate-limit-builder] ${message}`);
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

if (!input.rateLimitBackend || typeof input.rateLimitBackend !== 'object') {
  fail('rateLimitBackend is required');
}
if (input.rateLimitBackend.scope !== 'distributed') {
  fail('rateLimitBackend.scope must be distributed');
}
assertString(input.rateLimitBackend.provider, 'rateLimitBackend.provider');
assertString(input.rateLimitBackend.evidenceLocation, 'rateLimitBackend.evidenceLocation');

if (!Array.isArray(input.sensitiveEndpointsReviewed) || input.sensitiveEndpointsReviewed.length === 0) {
  fail('sensitiveEndpointsReviewed must include at least one endpoint');
}

const categories = new Set();
for (const [index, endpoint] of input.sensitiveEndpointsReviewed.entries()) {
  assertString(endpoint.endpoint, `sensitiveEndpointsReviewed[${index}].endpoint`);
  assertString(endpoint.category, `sensitiveEndpointsReviewed[${index}].category`);
  assertString(endpoint.limitPolicy, `sensitiveEndpointsReviewed[${index}].limitPolicy`);
  assertString(endpoint.keyingStrategy, `sensitiveEndpointsReviewed[${index}].keyingStrategy`);
  assertString(endpoint.status, `sensitiveEndpointsReviewed[${index}].status`);
  assertString(endpoint.evidenceLocation, `sensitiveEndpointsReviewed[${index}].evidenceLocation`);
  categories.add(String(endpoint.category).trim().toLowerCase());

  if (input.status === 'Complete' && endpoint.status !== 'enforced') {
    fail(`${endpoint.endpoint} must have status enforced for Complete evidence`);
  }
}

if (input.status === 'Complete') {
  for (const category of requiredCompleteCategories) {
    if (!categories.has(category)) {
      fail(`Complete evidence must include rate limit coverage for category: ${category}`);
    }
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
  control: 'distributed-rate-limit-sensitive-endpoints',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  rateLimitBackend: input.rateLimitBackend,
  sensitiveEndpointsReviewed: input.sensitiveEndpointsReviewed,
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
console.log(`[p1-rate-limit-builder] wrote ${outputPath}`);
