import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'audit-chain-verifiable.json');

const requiredControls = [
  'Audit events include stable event identifiers',
  'Audit chain preserves previous-hash continuity',
  'Audit event ordering or sequence continuity is verified',
  'Audit timestamps are monotonic within accepted tolerance',
  'Audit storage is append-only or tamper-evident',
  'Verification evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-audit-chain] ${message}`);
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

function assertNoPlaceholders(value, field = 'evidence') {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const forbidden = ['REPLACE_', 'YYYY-MM-DD', 'placeholder', 'TODO'];
  const matched = forbidden.find((token) => serialized.includes(token));
  if (matched) {
    fail(`${field} contains placeholder token: ${matched}`);
  }
}

if (!fs.existsSync(evidencePath)) {
  console.log(`[p1-audit-chain] No final evidence file found at ${evidencePath}; control remains open.`);
  process.exit(0);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
assertNoPlaceholders(evidence);

if (evidence.control !== 'audit-chain-verifiable') {
  fail('control must be audit-chain-verifiable');
}

if (!['Complete', 'Exception'].includes(evidence.status)) {
  fail('status must be Complete or Exception');
}

assertString(evidence.reviewedAt, 'reviewedAt');
assertString(evidence.reviewer, 'reviewer');
assertString(evidence.targetEnvironment, 'targetEnvironment');

if (evidence.redactionStatement !== 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.') {
  fail('redactionStatement must confirm secrets and access-granting values are redacted');
}

if (!evidence.chainScope || typeof evidence.chainScope !== 'object') {
  fail('chainScope is required');
}
assertString(evidence.chainScope.periodStart, 'chainScope.periodStart');
assertString(evidence.chainScope.periodEnd, 'chainScope.periodEnd');

if (!Array.isArray(evidence.chainScope.systemsCovered) || evidence.chainScope.systemsCovered.length === 0) {
  fail('chainScope.systemsCovered must list covered systems');
}

if (!Array.isArray(evidence.chainScope.eventClassesCovered) || evidence.chainScope.eventClassesCovered.length < 5) {
  fail('chainScope.eventClassesCovered must list at least five covered event classes');
}

if (!Array.isArray(evidence.chainSegmentsReviewed) || evidence.chainSegmentsReviewed.length === 0) {
  fail('chainSegmentsReviewed must include at least one verified chain segment');
}

for (const [index, segment] of evidence.chainSegmentsReviewed.entries()) {
  assertString(segment.segment, `chainSegmentsReviewed[${index}].segment`);
  assertString(segment.sourceSystem, `chainSegmentsReviewed[${index}].sourceSystem`);
  assertString(segment.sinkOrStore, `chainSegmentsReviewed[${index}].sinkOrStore`);
  assertString(segment.hashAlgorithm, `chainSegmentsReviewed[${index}].hashAlgorithm`);
  assertString(segment.rootOrCheckpointHash, `chainSegmentsReviewed[${index}].rootOrCheckpointHash`);
  assertString(segment.evidenceLocation, `chainSegmentsReviewed[${index}].evidenceLocation`);

  if (evidence.status === 'Complete') {
    assertBoolean(segment.previousHashContinuityVerified, `chainSegmentsReviewed[${index}].previousHashContinuityVerified`);
    assertBoolean(segment.sequenceContinuityVerified, `chainSegmentsReviewed[${index}].sequenceContinuityVerified`);
    assertBoolean(segment.timestampContinuityVerified, `chainSegmentsReviewed[${index}].timestampContinuityVerified`);
    assertBoolean(segment.tamperEvidenceVerified, `chainSegmentsReviewed[${index}].tamperEvidenceVerified`);

    if (!segment.previousHashContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify previous hash continuity`);
    if (!segment.sequenceContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify sequence continuity`);
    if (!segment.timestampContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify timestamp continuity`);
    if (!segment.tamperEvidenceVerified) fail(`chainSegmentsReviewed[${index}] must verify tamper evidence`);
  }
}

if (!Array.isArray(evidence.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!evidence.controlsVerified.includes(control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(evidence.nextReviewDue, 'nextReviewDue');

if (evidence.status === 'Exception') {
  if (!evidence.exception || typeof evidence.exception !== 'object') {
    fail('Exception status requires exception object');
  }
  assertString(evidence.exception.riskOwner, 'exception.riskOwner');
  assertString(evidence.exception.rationale, 'exception.rationale');
  assertString(evidence.exception.expiresAt, 'exception.expiresAt');
  assertString(evidence.exception.approvalReference, 'exception.approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) {
    fail('exception.compensatingControls must list compensating controls');
  }
}

console.log(`[p1-audit-chain] Evidence validated at ${evidencePath}`);
