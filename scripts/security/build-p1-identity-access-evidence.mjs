#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'sso-saml-oidc.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'sso-saml-oidc.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const allowedProtocols = new Set(['SAML', 'OIDC']);

function fail(message) {
  console.error(`[p1-identity-builder] ${message}`);
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

if (!Array.isArray(input.identityProtocolsReviewed) || input.identityProtocolsReviewed.length === 0) {
  fail('identityProtocolsReviewed must include at least one entry');
}

for (const [index, entry] of input.identityProtocolsReviewed.entries()) {
  assertString(entry.protocol, `identityProtocolsReviewed[${index}].protocol`);
  assertString(entry.provider, `identityProtocolsReviewed[${index}].provider`);
  assertString(entry.tenantOrOrgScope, `identityProtocolsReviewed[${index}].tenantOrOrgScope`);
  assertString(entry.status, `identityProtocolsReviewed[${index}].status`);
  assertString(entry.evidenceLocation, `identityProtocolsReviewed[${index}].evidenceLocation`);

  if (!allowedProtocols.has(entry.protocol)) {
    fail(`${entry.protocol} is not an allowed identity protocol`);
  }

  if (input.status === 'Complete' && entry.status !== 'configured') {
    fail(`${entry.provider} must have status configured for Complete evidence`);
  }
}

if (!Array.isArray(input.accessBoundariesReviewed) || input.accessBoundariesReviewed.length === 0) {
  fail('accessBoundariesReviewed must include at least one boundary');
}

for (const [index, boundary] of input.accessBoundariesReviewed.entries()) {
  assertString(boundary.boundary, `accessBoundariesReviewed[${index}].boundary`);
  assertString(boundary.evidenceLocation, `accessBoundariesReviewed[${index}].evidenceLocation`);
  if (!Array.isArray(boundary.mappedRolesOrGroups) || boundary.mappedRolesOrGroups.length === 0) {
    fail(`accessBoundariesReviewed[${index}].mappedRolesOrGroups must include at least one mapping`);
  }
}

if (!Array.isArray(input.controlsVerified) || input.controlsVerified.length < 5) {
  fail('controlsVerified must include at least five controls');
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'sso-saml-oidc',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  identityProtocolsReviewed: input.identityProtocolsReviewed,
  accessBoundariesReviewed: input.accessBoundariesReviewed,
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
console.log(`[p1-identity-builder] wrote ${outputPath}`);
