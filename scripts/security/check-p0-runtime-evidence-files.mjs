import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = 'docs/security/evidence/runtime';
const allowedItems = new Set([
  'branch-protection-main',
  'required-status-checks',
  'ci-required-checks-validation',
  'ci-assessed-commit-validation',
  'deployment-health-validation',
  'deployment-smoke-validation',
  'rollback-dry-run-validation',
  'final-validation-runner',
  'production-secrets-provider-stores',
  'supabase-live-rls-validation',
  'external-security-review-or-pentest',
  'step-up-mfa-validation',
  'google-oauth-validation',
  'upload-malware-scan-validation',
  'audit-chain-live-validation',
  'stripe-billing-validation',
  'observability-readiness',
  'observability-smoke-validation',
  'rate-limit-validation',
  'enterprise-final-readiness-validation',
  'enterprise-release-env-readiness',
  'enterprise-10-10-audit',
  // GDPR privacy evidence added by the enterprise privacy controls package.
  'gdpr-privacy-validation',
]);
const redactionTexts = new Set([
  'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
  'Redaction confirmed for runtime evidence.',
  'Redaction confirmed for runtime evidence. Rollback target values are not written to evidence.',
  'Supabase project reference, credentials, tokens, secrets, connection strings, and access-granting values are redacted.',
  'Only grouped configuration presence and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.',
]);
const failures = [];

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  return entries
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile() && path.endsWith('.json'));
}

function requireString(file, object, key, minLength = 1) {
  if (typeof object[key] !== 'string' || object[key].trim().length < minLength) {
    failures.push(`${file} missing valid string field: ${key}`);
  }
}

function requireArray(file, object, key, minItems = 1) {
  if (!Array.isArray(object[key]) || object[key].length < minItems) {
    failures.push(`${file} missing valid array field: ${key}`);
  }
}

function requireObject(file, object, key) {
  if (!object[key] || typeof object[key] !== 'object' || Array.isArray(object[key])) {
    failures.push(`${file} missing valid object field: ${key}`);
    return null;
  }

  return object[key];
}

function hasValidRedactionText(evidence) {
  return redactionTexts.has(String(evidence.redactionConfirmation ?? ''));
}

function hasBlockedGateText(evidence) {
  return String(evidence.releaseGate ?? evidence.productionGate ?? '').toLowerCase().includes('blocked');
}

function checkGenericOpenBlockedEvidence(file, evidence, allowedOpenOutcomes) {
  if (evidence.status !== 'Open') return false;
  if (!allowedOpenOutcomes.has(evidence.outcome)) return false;

  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }

  if (!hasBlockedGateText(evidence)) {
    failures.push(`${file} Open evidence must keep the release blocked`);
  }

  if (Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length > 0) {
    failures.push(`${file} Open evidence must not list controlsVerified as if passed`);
  }

  return true;
}

function checkReleaseOpenPlaceholder(file, evidence) {
  if (!new Set(['deployment-smoke-validation', 'rollback-dry-run-validation', 'final-validation-runner']).has(evidence.evidenceItem)) return false;

  return checkGenericOpenBlockedEvidence(file, evidence, new Set(['failed']));
}

function checkEnterpriseReleaseEnvOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-release-env-readiness' || evidence.status !== 'Open') return false;

  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['not_run', 'failed']))) return true;

  if (evidence.evidenceIntegrity?.placeholderOnly !== true) {
    failures.push(`${file} Open enterprise release env evidence must be marked placeholderOnly`);
  }

  if (evidence.evidenceIntegrity?.rawUrlsStored !== false) {
    failures.push(`${file} enterprise release env evidence must confirm raw URLs are not stored`);
  }

  if (evidence.evidenceIntegrity?.authorizationHeaderStored !== false) {
    failures.push(`${file} enterprise release env evidence must confirm Authorization headers are not stored`);
  }

  if (evidence.evidenceIntegrity?.cookiesStored !== false) {
    failures.push(`${file} enterprise release env evidence must confirm cookies are not stored`);
  }

  return true;
}

function checkSupabaseOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'supabase-live-rls-validation' || evidence.status !== 'Open') return false;

  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }

  if (evidence.outcome !== 'not_run' && evidence.outcome !== 'failed') {
    failures.push(`${file} Open Supabase evidence must have outcome not_run or failed`);
  }

  if (!String(evidence.productionGate ?? '').toLowerCase().includes('blocked')) {
    failures.push(`${file} Open Supabase evidence must keep production blocked`);
  }

  if (!String(evidence.completionRule ?? '').includes('run')) {
    failures.push(`${file} Open Supabase evidence must include completion rule`);
  }

  return true;
}

function checkExternalReviewOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'external-security-review-or-pentest' || evidence.status !== 'Open') return false;

  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }

  if (evidence.outcome !== 'not_started' && evidence.outcome !== 'not_run') {
    failures.push(`${file} Open external review evidence must have outcome not_started or not_run`);
  }

  if (!String(evidence.releaseGate ?? '').toLowerCase().includes('blocked')) {
    failures.push(`${file} Open external review evidence must keep enterprise release blocked`);
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== true) {
    failures.push(`${file} Open external review evidence must be marked placeholderOnly`);
  }

  if (evidence.evidenceIntegrity?.realExternalReportAttached !== false) {
    failures.push(`${file} Open external review evidence must confirm no real external report is attached`);
  }

  return true;
}

function checkEnterpriseFinalReadinessOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-final-readiness-validation' || evidence.status !== 'Open') return false;

  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }

  if (evidence.outcome !== 'no_go') {
    failures.push(`${file} Open enterprise final readiness evidence must have outcome no_go`);
  }

  if (evidence.releaseDecision !== 'No-Go') {
    failures.push(`${file} Open enterprise final readiness evidence must keep releaseDecision No-Go`);
  }

  if (!String(evidence.productionGate ?? '').toLowerCase().includes('blocked')) {
    failures.push(`${file} Open enterprise final readiness evidence must keep production blocked`);
  }

  if (!String(evidence.completionRule ?? '').toLowerCase().includes('complete')) {
    failures.push(`${file} Open enterprise final readiness evidence must include completion rule`);
  }

  if (!evidence.blockingEvidence || typeof evidence.blockingEvidence !== 'object' || Array.isArray(evidence.blockingEvidence)) {
    failures.push(`${file} Open enterprise final readiness evidence must document blockingEvidence`);
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== true) {
    failures.push(`${file} Open enterprise final readiness evidence must be marked placeholderOnly`);
  }

  if (evidence.evidenceIntegrity?.realRuntimeEvidenceAttached !== false) {
    failures.push(`${file} Open enterprise final readiness evidence must confirm no real runtime evidence is attached`);
  }

  if (evidence.evidenceIntegrity?.customerFacingProof !== false) {
    failures.push(`${file} Open enterprise final readiness evidence must not be customer-facing proof`);
  }

  return true;
}

function checkEnterpriseAuditOpenEvidence(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-10-10-audit') return false;

  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['no_go']))) {
    failures.push(`${file} enterprise audit evidence must remain Open/no_go until every P0 proof is complete`);
    return true;
  }

  if (evidence.decision !== 'No-Go') {
    failures.push(`${file} enterprise audit evidence must keep decision No-Go`);
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== true) {
    failures.push(`${file} enterprise audit evidence must be marked placeholderOnly`);
  }

  if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) {
    failures.push(`${file} enterprise audit evidence must confirm runtime proof was not invented`);
  }

  if (evidence.evidenceIntegrity?.customerDataStored !== false) {
    failures.push(`${file} enterprise audit evidence must confirm customer data is not stored`);
  }

  if (evidence.evidenceIntegrity?.customerFacingProof !== false) {
    failures.push(`${file} enterprise audit evidence must not be customer-facing proof`);
  }

  return true;
}

function checkCompleteEvidence(file, evidence) {
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  requireArray(file, evidence, 'controlsVerified', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }
}

function checkExceptionEvidence(file, evidence) {
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (!hasValidRedactionText(evidence)) {
    failures.push(`${file} missing redaction confirmation`);
  }

  const exception = requireObject(file, evidence, 'exception');
  if (!exception) return;

  requireString(file, exception, 'riskOwner', 3);
  requireString(file, exception, 'rationale', 20);
  requireArray(file, exception, 'compensatingControls', 1);
  requireString(file, exception, 'expiresAt', 10);
  requireString(file, exception, 'approvalReference', 5);
}

const files = listJsonFiles(evidenceDir);

for (const file of files) {
  const evidence = JSON.parse(readFileSync(file, 'utf8'));

  if (!allowedItems.has(evidence.evidenceItem)) {
    failures.push(`${file} has unexpected evidenceItem: ${evidence.evidenceItem}`);
    continue;
  }

  if (checkReleaseOpenPlaceholder(file, evidence)) continue;
  if (checkEnterpriseReleaseEnvOpenPlaceholder(file, evidence)) continue;
  if (checkSupabaseOpenPlaceholder(file, evidence)) continue;
  if (checkExternalReviewOpenPlaceholder(file, evidence)) continue;
  if (checkEnterpriseFinalReadinessOpenPlaceholder(file, evidence)) continue;
  if (checkEnterpriseAuditOpenEvidence(file, evidence)) continue;

  if (evidence.status === 'Complete') {
    checkCompleteEvidence(file, evidence);
    continue;
  }

  if (evidence.status === 'Exception') {
    checkExceptionEvidence(file, evidence);
    continue;
  }

  failures.push(`${file} has unsupported runtime evidence status/outcome combination`);
}

if (failures.length > 0) {
  console.error('Runtime evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${files.length} runtime evidence file(s).`);
