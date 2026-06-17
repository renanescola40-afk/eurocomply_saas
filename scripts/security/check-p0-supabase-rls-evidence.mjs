#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const exactRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;

function fail(message) {
  console.error(`P0 Supabase RLS evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`No ${evidencePath} file found yet; Supabase live RLS runtime evidence remains open.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (evidence.evidenceItem !== 'supabase-live-rls-validation') {
  fail('evidenceItem must be supabase-live-rls-validation');
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

  if (!Array.isArray(evidence.testCases) || evidence.testCases.length < 4) {
    fail('Complete evidence must include testCases for read denial, write denial, same-tenant allow, and service-role review');
  }

  const testCaseIds = new Set(evidence.testCases.map((entry) => String(entry.id || '')));
  for (const requiredCase of [
    'rls-cross-tenant-read-denied',
    'rls-cross-tenant-write-denied',
    'rls-same-tenant-allowed',
    'rls-service-role-review',
  ]) {
    if (!testCaseIds.has(requiredCase)) {
      fail(`Complete evidence must include test case ${requiredCase}`);
    }
  }

  for (const entry of evidence.testCases) {
    if (entry.status !== 'passed' || !entry.evidenceLocation || !entry.notes) {
      fail('each testCases entry must have status passed, evidenceLocation, and notes');
    }
  }

  if (!Array.isArray(evidence.tablesReviewed) || evidence.tablesReviewed.length === 0) {
    fail('Complete evidence must include tablesReviewed entries');
  }

  for (const entry of evidence.tablesReviewed) {
    if (!entry.table || !entry.status || !entry.evidenceLocation) {
      fail('each tablesReviewed entry must include table, status, and evidenceLocation');
    }
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

console.log('P0 Supabase RLS evidence file is valid.');
