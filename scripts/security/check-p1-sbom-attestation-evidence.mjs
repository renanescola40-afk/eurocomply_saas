#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'sbom-artifact-attestation.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const allowedSbomFormats = new Set(['SPDX', 'CycloneDX']);
const requiredControls = [
  'SBOM is generated for release artifacts',
  'Artifact attestation exists for release artifacts',
  'Attestation subject digest matches the released artifact',
  'Verification workflow or command is documented',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`P1 SBOM attestation evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 SBOM attestation evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'sbom-artifact-attestation') fail('control must be sbom-artifact-attestation');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!evidence.sbom || !evidence.sbom.format || !evidence.sbom.generatedForRef || !evidence.sbom.artifactName || !evidence.sbom.evidenceLocation || !evidence.sbom.status) fail('sbom must include format, generatedForRef, artifactName, evidenceLocation, and status');
if (!allowedSbomFormats.has(evidence.sbom.format)) fail('sbom.format must be SPDX or CycloneDX');
if (evidence.status === 'Complete' && evidence.sbom.status !== 'generated') fail('sbom.status must be generated for Complete evidence');

if (!Array.isArray(evidence.attestations) || evidence.attestations.length === 0) fail('attestations must include at least one attestation');
for (const attestation of evidence.attestations) {
  if (!attestation.artifactName || !attestation.attestationType || !attestation.issuer || !attestation.subjectDigest || !attestation.status || !attestation.evidenceLocation) fail('each attestation must include artifactName, attestationType, issuer, subjectDigest, status, and evidenceLocation');
  if (evidence.status === 'Complete' && attestation.status !== 'verified') fail(`${attestation.artifactName} attestation must be verified for Complete evidence`);
}

if (!evidence.verification || !evidence.verification.verificationCommandOrWorkflow || !evidence.verification.policy || !evidence.verification.status || !evidence.verification.evidenceLocation) fail('verification must include verificationCommandOrWorkflow, policy, status, and evidenceLocation');
if (evidence.status === 'Complete' && evidence.verification.status !== 'passed') fail('verification.status must be passed for Complete evidence');

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 SBOM attestation evidence is valid: ${evidencePath}`);
