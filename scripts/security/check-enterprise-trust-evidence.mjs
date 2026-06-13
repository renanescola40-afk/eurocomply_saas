#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const MANIFEST_PATH = path.join(ROOT_DIR, 'docs/trust/evidence/enterprise-trust-evidence.json');
const ALLOWED_STATUSES = new Set([
  'not_available',
  'planned',
  'draft',
  'partial',
  'partial_strong',
  'available',
  'externally_validated',
]);

const CLAIMS_REQUIRING_EXTERNAL_EVIDENCE = new Set([
  'iso-27001',
  'soc-2',
  'external-pentest',
]);

function fail(message) {
  console.error(`Enterprise trust evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  fail('docs/trust/evidence/enterprise-trust-evidence.json is missing.');
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (error) {
  fail(`manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (manifest.schemaVersion !== '2026-06-13.enterprise-trust-evidence.v1') {
  fail('unexpected schemaVersion. Update this check when intentionally changing the trust evidence schema.');
}

if (!Array.isArray(manifest.claims) || manifest.claims.length === 0) {
  fail('manifest.claims must be a non-empty array.');
}

const seenIds = new Set();
for (const [index, claim] of manifest.claims.entries()) {
  if (!claim || typeof claim !== 'object') {
    fail(`claim at index ${index} must be an object.`);
  }

  if (!claim.id || typeof claim.id !== 'string') {
    fail(`claim at index ${index} is missing a string id.`);
  }

  if (seenIds.has(claim.id)) {
    fail(`duplicate claim id: ${claim.id}`);
  }
  seenIds.add(claim.id);

  if (!ALLOWED_STATUSES.has(claim.status)) {
    fail(`claim ${claim.id} has invalid status: ${claim.status}`);
  }

  if (!claim.question || typeof claim.question !== 'string') {
    fail(`claim ${claim.id} is missing a customer question.`);
  }

  if (!claim.customerAnswer || typeof claim.customerAnswer !== 'string') {
    fail(`claim ${claim.id} is missing a safe customerAnswer.`);
  }

  if (!Array.isArray(claim.evidence) || claim.evidence.length === 0) {
    fail(`claim ${claim.id} must include at least one evidence path.`);
  }

  for (const evidencePath of claim.evidence) {
    if (typeof evidencePath !== 'string' || evidencePath.length === 0) {
      fail(`claim ${claim.id} contains an invalid evidence path.`);
    }
  }

  if (!Array.isArray(claim.blockers)) {
    fail(`claim ${claim.id} must include blockers array, even when empty.`);
  }

  if (!Array.isArray(claim.nextActions) || claim.nextActions.length === 0) {
    fail(`claim ${claim.id} must include nextActions.`);
  }

  if (CLAIMS_REQUIRING_EXTERNAL_EVIDENCE.has(claim.id) && claim.status === 'externally_validated') {
    const hasExternalEvidence = claim.evidence.some(evidencePath =>
      evidencePath.startsWith('docs/trust/external/') || evidencePath.startsWith('evidence/external/')
    );

    if (!hasExternalEvidence) {
      fail(`claim ${claim.id} cannot be externally_validated without external evidence path.`);
    }
  }

  const unsafeAnswerPattern = /\b(we have|certified|audited|completed|guaranteed|immutable)\b/i;
  const draftLikeStatus = new Set(['not_available', 'planned', 'draft', 'partial', 'partial_strong']);
  if (draftLikeStatus.has(claim.status) && unsafeAnswerPattern.test(claim.customerAnswer)) {
    fail(`claim ${claim.id} has potentially over-claiming customerAnswer for status ${claim.status}.`);
  }
}

console.log('Enterprise trust evidence check');
console.log('-------------------------------');
console.log(`Claims validated: ${manifest.claims.length}`);
console.log('Enterprise trust evidence: ok');
