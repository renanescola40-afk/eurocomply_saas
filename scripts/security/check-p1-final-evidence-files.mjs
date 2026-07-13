#!/usr/bin/env node
import fs from 'node:fs';

const strict = process.argv.includes('--strict');

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

const forbiddenPlaceholders = /\b(tbd|todo|placeholder|example|sample|dummy|fake|mock|lorem|ipsum|changeme|n\/a|none)\b/i;
const allowedStatuses = new Set(['Complete']);

function fail(message) {
  console.error(`[p1-final-evidence] ${message}`);
  process.exitCode = 1;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value, field, file) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${file}: ${field} must be a non-empty string`);
    return;
  }
  if (forbiddenPlaceholders.test(value)) {
    fail(`${file}: ${field} contains placeholder-like text: ${value}`);
  }
}

function assertProductionEnvironment(value, field, file) {
  if (value !== 'production') {
    fail(`${file}: ${field} must be production for final P1 evidence`);
  }
}

function assertBooleanTrue(value, field, file) {
  if (value !== true) {
    fail(`${file}: ${field} must be true for final P1 evidence`);
  }
}

function assertArray(value, field, file) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${file}: ${field} must be a non-empty array`);
    return false;
  }
  return true;
}

function readEvidence(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file}: invalid JSON: ${error.message}`);
    return null;
  }
}

function validateArtifact(artifact, file, index) {
  if (!isObject(artifact)) {
    fail(`${file}: artifacts[${index}] must be an object`);
    return;
  }
  assertString(artifact.type, `artifacts[${index}].type`, file);
  assertString(artifact.reference, `artifacts[${index}].reference`, file);
  assertString(artifact.description, `artifacts[${index}].description`, file);
  assertString(artifact.collectedAt, `artifacts[${index}].collectedAt`, file);
}

function validateEvidence(controlId, control, file) {
  const evidence = readEvidence(file);
  if (!evidence || !isObject(evidence)) {
    fail(`${file}: evidence must be a JSON object`);
    return;
  }

  if (evidence.schemaVersion !== 1) fail(`${file}: schemaVersion must be 1`);
  if (evidence.controlId !== controlId) fail(`${file}: controlId must be ${controlId}`);
  if (evidence.control !== control) fail(`${file}: control must be ${control}`);
  if (!allowedStatuses.has(evidence.status)) fail(`${file}: status must be Complete`);
  if (evidence.evidenceKind !== 'final-p1-control-evidence') {
    fail(`${file}: evidenceKind must be final-p1-control-evidence`);
  }

  assertBooleanTrue(evidence.generatedFromRealEvidence, 'generatedFromRealEvidence', file);
  assertBooleanTrue(evidence.productionValidated, 'productionValidated', file);
  assertProductionEnvironment(evidence.environment, 'environment', file);
  assertProductionEnvironment(evidence.targetEnvironment, 'targetEnvironment', file);
  assertString(evidence.generatedAt, 'generatedAt', file);
  assertString(evidence.reviewedAt, 'reviewedAt', file);
  assertString(evidence.reviewer, 'reviewer', file);
  assertString(evidence.nextReviewDue, 'nextReviewDue', file);

  if (!isObject(evidence.validation)) {
    fail(`${file}: validation must be an object`);
  } else {
    if (evidence.validation.result !== 'pass') fail(`${file}: validation.result must be pass`);
    assertString(evidence.validation.validatedAt, 'validation.validatedAt', file);
    assertString(evidence.validation.validator, 'validation.validator', file);
    assertString(evidence.validation.method, 'validation.method', file);
  }

  if (assertArray(evidence.artifacts, 'artifacts', file)) {
    evidence.artifacts.forEach((artifact, index) => validateArtifact(artifact, file, index));
  }

  console.log(`[p1-final-evidence] valid final evidence structure: ${file}`);
}

let present = 0;

for (const [controlId, control, file] of expectedControls) {
  if (!fs.existsSync(file)) {
    console.log(`[p1-final-evidence] missing: ${controlId} ${control} -> ${file}`);
    if (strict) fail(`${file}: missing final evidence file`);
    continue;
  }

  present += 1;
  validateEvidence(controlId, control, file);
}

const total = expectedControls.length;
const percent = Math.round((present / total) * 100);
console.log(`[p1-final-evidence] final evidence files present: ${present}/${total} = ${percent}%`);

if (process.exitCode) process.exit(process.exitCode);
