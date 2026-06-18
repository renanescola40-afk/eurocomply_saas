#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'verifiable-production-audit-chain.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'verifiable-production-audit-chain.json');

const requiredRedactionStatement = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Audit events include stable event identifiers',
  'Audit chain preserves previous-hash continuity',
  'Audit event ordering or sequence continuity is verified',
  'Audit timestamps are monotonic within accepted tolerance',
  'Audit storage is append-only or tamper-evident',
  'Verification evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-audit-builder] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function assertBoolean(value, field) {
  if (typeof value !== 'boolean') {
    fail(`${field} must be a boolean`);
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

if (!input.chainScope || typeof input.chainScope !== 'object') {
  fail('chainScope is required');
}
assertString(input.chainScope.periodStart, 'chainScope.periodStart');
assertString(input.chainScope.periodEnd, 'chainScope.periodEnd');

if (!Array.isArray(input.chainScope.systemsCovered) || input.chainScope.systemsCovered.length === 0) {
  fail('chainScope.systemsCovered must list covered systems');
}
if (!Array.isArray(input.chainScope.eventClassesCovered) || input.chainScope.eventClassesCovered.length < 5) {
  fail('chainScope.eventClassesCovered must list at least five covered event classes');
}

if (!Array.isArray(input.chainSegmentsReviewed) || input.chainSegmentsReviewed.length === 0) {
  fail('chainSegmentsReviewed must include at least one verified chain segment');
}

for (const [index, segment] of input.chainSegmentsReviewed.entries()) {
  for (const field of ['segment', 'sourceSystem', 'sinkOrStore', 'hashAlgorithm', 'rootOrCheckpointHash', 'evidenceLocation']) {
    assertString(segment[field], `chainSegmentsReviewed[${index}].${field}`);
  }

  if (input.status === 'Complete') {
    for (const field of ['previousHashContinuityVerified', 'sequenceContinuityVerified', 'timestampContinuityVerified', 'tamperEvidenceVerified']) {
      assertBoolean(segment[field], `chainSegmentsReviewed[${index}].${field}`);
      if (segment[field] !== true) {
        fail(`chainSegmentsReviewed[${index}].${field} must be true for Complete evidence`);
      }
    }
  }
}

if (!Array.isArray(input.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!input.controlsVerified.includes(control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'verifiable-production-audit-chain',
  status: input.status,
  redactionStatement: requiredRedactionStatement,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  chainScope: input.chainScope,
  chainSegmentsReviewed: input.chainSegmentsReviewed,
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
console.log(`[p1-audit-builder] wrote ${outputPath}`);
