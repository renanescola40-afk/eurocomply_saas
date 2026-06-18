#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'sbom-artifact-attestation.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'sbom-artifact-attestation.json');

const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const allowedSbomFormats = new Set(['SPDX', 'CycloneDX']);
const requiredControls = [
  'SBOM is generated for release artifacts',
  'Artifact attestation exists for release artifacts',
  'Attestation subject digest matches the released artifact',
  'Verification workflow or command is documented',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-sbom-builder] ${message}`);
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

if (!input.sbom || typeof input.sbom !== 'object') {
  fail('sbom is required');
}
for (const field of ['format', 'generatedForRef', 'artifactName', 'evidenceLocation', 'status']) {
  assertString(input.sbom[field], `sbom.${field}`);
}
if (!allowedSbomFormats.has(input.sbom.format)) {
  fail('sbom.format must be SPDX or CycloneDX');
}
if (input.status === 'Complete' && input.sbom.status !== 'generated') {
  fail('sbom.status must be generated for Complete evidence');
}

if (!Array.isArray(input.attestations) || input.attestations.length === 0) {
  fail('attestations must include at least one attestation');
}
for (const [index, attestation] of input.attestations.entries()) {
  for (const field of ['artifactName', 'attestationType', 'issuer', 'subjectDigest', 'status', 'evidenceLocation']) {
    assertString(attestation[field], `attestations[${index}].${field}`);
  }
  if (input.status === 'Complete' && attestation.status !== 'verified') {
    fail(`${attestation.artifactName} attestation must be verified for Complete evidence`);
  }
}

if (!input.verification || typeof input.verification !== 'object') {
  fail('verification is required');
}
for (const field of ['verificationCommandOrWorkflow', 'policy', 'status', 'evidenceLocation']) {
  assertString(input.verification[field], `verification.${field}`);
}
if (input.status === 'Complete' && input.verification.status !== 'passed') {
  fail('verification.status must be passed for Complete evidence');
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
  control: 'sbom-artifact-attestation',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  sbom: input.sbom,
  attestations: input.attestations,
  verification: input.verification,
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
console.log(`[p1-sbom-builder] wrote ${outputPath}`);
