import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'verifiable-production-audit-chain.json');

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

function assertTrue(value, field) {
  if (value !== true) {
    fail(`${field} must be true for final P1 audit-chain evidence`);
  }
}

function assertObject(value, field) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${field} must be an object`);
  }
}

function assertArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${field} must be a non-empty array`);
  }
}

function assertNoPlaceholders(value, field = 'evidence') {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const forbidden = ['REPLACE_', 'YYYY-MM-DD', 'placeholder', 'TODO', 'TBD', 'dummy', 'fake', 'mock'];
  const matched = forbidden.find((token) => serialized.includes(token));
  if (matched) {
    fail(`${field} contains placeholder token: ${matched}`);
  }
}

function validateFinalP1Contract(evidence) {
  if (evidence.schemaVersion !== 1) {
    fail('schemaVersion must be 1');
  }
  if (evidence.controlId !== 'P1-09') {
    fail('controlId must be P1-09');
  }
  if (evidence.control !== 'verifiable-production-audit-chain') {
    fail('control must be verifiable-production-audit-chain');
  }
  if (evidence.status !== 'Complete') {
    fail('status must be Complete for final P1 audit-chain evidence');
  }
  if (evidence.evidenceKind !== 'final-p1-control-evidence') {
    fail('evidenceKind must be final-p1-control-evidence');
  }

  assertTrue(evidence.generatedFromRealEvidence, 'generatedFromRealEvidence');
  assertTrue(evidence.productionValidated, 'productionValidated');
  assertString(evidence.generatedAt, 'generatedAt');
  assertString(evidence.reviewedAt, 'reviewedAt');
  assertString(evidence.reviewer, 'reviewer');
  assertString(evidence.nextReviewDue, 'nextReviewDue');
  assertString(evidence.environment, 'environment');

  assertObject(evidence.validation, 'validation');
  if (evidence.validation.result !== 'pass') {
    fail('validation.result must be pass');
  }
  assertString(evidence.validation.validatedAt, 'validation.validatedAt');
  assertString(evidence.validation.validator, 'validation.validator');
  assertString(evidence.validation.method, 'validation.method');

  assertArray(evidence.artifacts, 'artifacts');
  for (const [index, artifact] of evidence.artifacts.entries()) {
    assertObject(artifact, `artifacts[${index}]`);
    assertString(artifact.type, `artifacts[${index}].type`);
    assertString(artifact.reference, `artifacts[${index}].reference`);
    assertString(artifact.description, `artifacts[${index}].description`);
    assertString(artifact.collectedAt, `artifacts[${index}].collectedAt`);
  }
}

if (!fs.existsSync(evidencePath)) {
  console.log(`[p1-audit-chain] No final evidence file found at ${evidencePath}; control remains open.`);
  process.exit(0);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
assertNoPlaceholders(evidence);
validateFinalP1Contract(evidence);

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
  assertBoolean(segment.previousHashContinuityVerified, `chainSegmentsReviewed[${index}].previousHashContinuityVerified`);
  assertBoolean(segment.sequenceContinuityVerified, `chainSegmentsReviewed[${index}].sequenceContinuityVerified`);
  assertBoolean(segment.timestampContinuityVerified, `chainSegmentsReviewed[${index}].timestampContinuityVerified`);
  assertBoolean(segment.tamperEvidenceVerified, `chainSegmentsReviewed[${index}].tamperEvidenceVerified`);

  if (!segment.previousHashContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify previous hash continuity`);
  if (!segment.sequenceContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify sequence continuity`);
  if (!segment.timestampContinuityVerified) fail(`chainSegmentsReviewed[${index}] must verify timestamp continuity`);
  if (!segment.tamperEvidenceVerified) fail(`chainSegmentsReviewed[${index}] must verify tamper evidence`);
}

if (!Array.isArray(evidence.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!evidence.controlsVerified.includes(control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

console.log(`[p1-audit-chain] Evidence validated at ${evidencePath}`);
