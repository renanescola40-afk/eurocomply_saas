#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'production-secrets-provider-stores.json');
const exactRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;

function fail(message) {
  console.error(`P0 production secrets evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`No ${evidencePath} file found yet; production secrets runtime evidence remains open.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (evidence.evidenceItem !== 'production-secrets-provider-stores') {
  fail('evidenceItem must be production-secrets-provider-stores');
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

if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 5) {
  fail('controlsVerified must include reviewed controls');
}

if (evidence.status === 'Complete') {
  if (!Array.isArray(evidence.providersReviewed) || evidence.providersReviewed.length < 3) {
    fail('Complete evidence must include providersReviewed entries for at least GitHub, Vercel, and Supabase');
  }

  const providerNames = new Set(evidence.providersReviewed.map((entry) => String(entry.provider || '').toLowerCase()));
  for (const requiredProvider of ['github', 'vercel', 'supabase']) {
    if (!providerNames.has(requiredProvider)) {
      fail(`Complete evidence must include provider ${requiredProvider}`);
    }
  }

  for (const entry of evidence.providersReviewed) {
    if (!entry.provider || !entry.environment || !entry.status || !entry.evidenceLocation) {
      fail('each providersReviewed entry must include provider, environment, status, and evidenceLocation');
    }
  }

  if (!evidence.rotationOwner || !evidence.nextReviewDue) {
    fail('Complete evidence must include rotationOwner and nextReviewDue');
  }
}

if (evidence.status === 'Exception') {
  const exception = evidence.exception;
  if (!exception || !exception.riskOwner || !exception.rationale || !exception.expiryDate || !exception.approvalReference) {
    fail('Exception evidence must include riskOwner, rationale, expiryDate, and approvalReference');
  }
}

console.log('P0 production secrets evidence file is valid.');
