#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const unknownFlags = args.filter((argument) => argument.startsWith('--') && argument !== '--strict');
const positionalArgs = args.filter((argument) => !argument.startsWith('--'));

function fail(message) {
  console.error(`[p1-evidence-index] ${message}`);
  process.exit(1);
}

if (unknownFlags.length > 0) {
  fail(`unknown option(s): ${unknownFlags.join(', ')}`);
}

if (positionalArgs.length > 1) {
  fail('expected at most one index path');
}

const indexPath = positionalArgs[0] || path.join('docs', 'security', 'evidence', 'p1', 'P1_EVIDENCE_INDEX.json');
const allowedStatuses = new Set(['Open', 'Complete', 'Exception']);
const expectedControls = [
  ['P1-01', 'sso-saml-oidc', 'docs/security/evidence/p1/sso-saml-oidc.json'],
  ['P1-02', 'admin-mfa-required', 'docs/security/evidence/p1/admin-mfa-required.json'],
  ['P1-03', 'step-up-sensitive-actions', 'docs/security/evidence/p1/step-up-sensitive-actions.json'],
  ['P1-04', 'distributed-rate-limit-sensitive-endpoints', 'docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json'],
  ['P1-05', 'dast-automated', 'docs/security/evidence/p1/dast-automated.json'],
  ['P1-06', 'sbom-artifact-attestation', 'docs/security/evidence/p1/sbom-artifact-attestation.json'],
  ['P1-07', 'backup-restore-tested', 'docs/security/evidence/p1/backup-restore-tested.json'],
  ['P1-08', 'centralized-logging-alerts', 'docs/security/evidence/p1/centralized-logging-alerts.json'],
  ['P1-09', 'verifiable-production-audit-chain', 'docs/security/evidence/p1/verifiable-production-audit-chain.json'],
  ['P1-10', 'waf-cdn-ddos', 'docs/security/evidence/p1/waf-cdn-ddos.json'],
];

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function assertCompleteEvidenceCoherence(entry, controlId, controlName) {
  const evidence = readJson(entry.evidencePath, `${controlId} evidence file`);
  if (typeof evidence !== 'object' || evidence === null || Array.isArray(evidence)) {
    fail(`${controlId} evidence file must contain a JSON object`);
  }

  const expectedFields = [
    ['controlId', controlId],
    ['control', controlName],
    ['status', 'Complete'],
    ['generatedFromRealEvidence', true],
    ['productionValidated', true],
    ['reviewedAt', entry.reviewedAt],
    ['reviewer', entry.reviewer],
    ['nextReviewDue', entry.nextReviewDue],
  ];

  for (const [field, expectedValue] of expectedFields) {
    if (evidence[field] !== expectedValue) {
      fail(`${controlId} evidence ${field} must match the canonical index`);
    }
  }
}

if (!fs.existsSync(indexPath)) {
  fail(`index file is missing: ${indexPath}`);
}

const index = readJson(indexPath, `index file ${indexPath}`);

if (index.schemaVersion !== 1) fail('schemaVersion must be 1');
if (index.phase !== 'P1 Enterprise Security') fail('phase must be P1 Enterprise Security');
if (!allowedStatuses.has(index.status)) fail('status must be Open, Complete, or Exception');
if (index.generatedFromRealEvidence !== false && index.status !== 'Complete') {
  fail('generatedFromRealEvidence must remain false until the index is complete');
}

if (!Array.isArray(index.controls) || index.controls.length !== expectedControls.length) {
  fail(`controls must include exactly ${expectedControls.length} entries`);
}

const byId = new Map(index.controls.map((control) => [control.controlId, control]));

for (const [controlId, controlName, evidencePath] of expectedControls) {
  const entry = byId.get(controlId);
  if (!entry) fail(`missing control ${controlId}`);
  if (entry.control !== controlName) fail(`${controlId}.control must be ${controlName}`);
  if (entry.evidencePath !== evidencePath) fail(`${controlId}.evidencePath must be ${evidencePath}`);
  if (!allowedStatuses.has(entry.status)) fail(`${controlId}.status must be Open, Complete, or Exception`);

  if (entry.status === 'Complete') {
    if (!fs.existsSync(entry.evidencePath)) fail(`${controlId} is Complete but evidence file is missing`);
    assertString(entry.reviewedAt, `${controlId}.reviewedAt`);
    assertString(entry.reviewer, `${controlId}.reviewer`);
    assertString(entry.nextReviewDue, `${controlId}.nextReviewDue`);
    assertCompleteEvidenceCoherence(entry, controlId, controlName);
  }

  if (entry.status === 'Exception') {
    assertString(entry.reviewedAt, `${controlId}.reviewedAt`);
    assertString(entry.reviewer, `${controlId}.reviewer`);
    assertString(entry.nextReviewDue, `${controlId}.nextReviewDue`);
    assertString(entry.exceptionReference, `${controlId}.exceptionReference`);
  }
}

if (index.status === 'Complete') {
  for (const entry of index.controls) {
    if (entry.status !== 'Complete') fail('phase cannot be Complete until every control is Complete');
  }
  if (index.generatedFromRealEvidence !== true) fail('Complete phase requires generatedFromRealEvidence true');
}

if (strict) {
  if (index.status !== 'Complete') fail('strict mode requires index status Complete');
  if (index.generatedFromRealEvidence !== true) {
    fail('strict mode requires generatedFromRealEvidence true');
  }
  for (const entry of index.controls) {
    if (entry.status !== 'Complete') {
      fail(`strict mode requires ${entry.controlId}.status to be Complete`);
    }
  }
}

console.log(`[p1-evidence-index] valid${strict ? ' in strict mode' : ''}: ${indexPath}`);
