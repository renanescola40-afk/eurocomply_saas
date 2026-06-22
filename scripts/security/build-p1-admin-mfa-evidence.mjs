#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'admin-mfa-required.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'admin-mfa-required.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;

function fail(message) {
  console.error(`[p1-admin-mfa-builder] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
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

if (!Array.isArray(input.identityProvidersReviewed) || input.identityProvidersReviewed.length === 0) {
  fail('identityProvidersReviewed must include at least one provider');
}

if (!Array.isArray(input.adminSurfacesReviewed) || input.adminSurfacesReviewed.length === 0) {
  fail('adminSurfacesReviewed must include at least one admin surface');
}

if (!Array.isArray(input.breakGlassAccounts)) {
  fail('breakGlassAccounts must be an array, even when empty');
}

if (!Array.isArray(input.controlsVerified) || input.controlsVerified.length < 5) {
  fail('controlsVerified must include at least five controls');
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'admin-mfa-required',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  identityProvidersReviewed: input.identityProvidersReviewed,
  adminSurfacesReviewed: input.adminSurfacesReviewed,
  breakGlassAccounts: input.breakGlassAccounts,
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
console.log(`[p1-admin-mfa-builder] wrote ${outputPath}`);
