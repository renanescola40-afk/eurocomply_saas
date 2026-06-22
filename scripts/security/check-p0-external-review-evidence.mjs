#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'external-security-review-or-pentest.json');
const exactRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;

function fail(message) {
  console.error(`P0 external review evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`No ${evidencePath} file found yet; external review runtime evidence remains open.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (evidence.evidenceItem !== 'external-security-review-or-pentest') {
  fail('evidenceItem must be external-security-review-or-pentest');
}

if (!['Complete', 'Exception'].includes(evidence.status)) {
  fail('status must be Complete or Exception');
}

if (evidence.redactionConfirmation !== exactRedaction) {
  fail('redactionConfirmation must match the required redaction sentence exactly');
}

const serialized = JSON.stringify(evidence, null, 2);
if (placeholderPattern.test(serialized)) {
  fail('evidence contains placeholder text');
}

if (!Array.isArray(evidence.evidenceLocations) || evidence.evidenceLocations.length === 0) {
  fail('evidenceLocations must include at least one durable redacted evidence reference');
}

if (evidence.status === 'Complete') {
  if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 4) {
    fail('Complete evidence must include controlsVerified entries');
  }

  if (!evidence.assessment || !evidence.assessment.provider || !evidence.assessment.assessmentType || !evidence.assessment.reportReference) {
    fail('Complete evidence must include assessment provider, assessmentType, and reportReference');
  }

  if (!Array.isArray(evidence.assessment.scope) || evidence.assessment.scope.length === 0) {
    fail('Complete evidence must include assessment scope');
  }

  if (!evidence.findingsSummary || typeof evidence.findingsSummary.releaseBlockingOpen !== 'number') {
    fail('Complete evidence must include findingsSummary.releaseBlockingOpen as a number');
  }

  if (evidence.findingsSummary.releaseBlockingOpen !== 0) {
    fail('Complete evidence must have zero open release-blocking observations');
  }

  if (!Array.isArray(evidence.trackingReferences) || evidence.trackingReferences.length === 0) {
    fail('Complete evidence must include trackingReferences');
  }

  if (!evidence.nextReviewDue) {
    fail('Complete evidence must include nextReviewDue');
  }
}

if (evidence.status === 'Exception') {
  const exception = evidence.exception;
  if (!exception || !exception.riskOwner || !exception.rationale || !exception.expiryDate || !exception.approvalReference) {
    fail('Exception evidence must include riskOwner, rationale, expiryDate, and approvalReference');
  }
}

console.log('P0 external review evidence file is valid.');
