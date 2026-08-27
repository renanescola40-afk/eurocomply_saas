import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = 'docs/security/evidence/runtime';
const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
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
  'auth-rbac-final-validation',
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
  'gdpr-privacy-validation',
  'enterprise-10-10-audit',
  'legal-rules-validation',
  'technical-closeout-consolidated',
]);
const redactionTexts = new Set([
  'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
  'Redaction confirmed for runtime evidence.',
  'Redaction confirmed for runtime evidence. Rollback target values are not written to evidence.',
  'Redaction confirmed: no token, cookie, authorization header, secret value, or secret environment variable name is written to this evidence file.',
  'Redaction confirmed: no token, cookie, authorization header, secret value, or raw rollback URL is written to this evidence file.',
  'Redaction confirmed: no token, cookie, authorization header, secret value, or DSN is written to this evidence file.',
  'Supabase project reference, credentials, tokens, secrets, connection strings, and access-granting values are redacted.',
  'Only grouped configuration presence and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.',
  'Only grouped configuration presence, derived booleans and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.',
]);
const failures = [];

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile() && path.endsWith('.json'));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
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
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  if (!hasBlockedGateText(evidence)) failures.push(`${file} Open evidence must keep the release blocked`);
  if (Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length > 0) {
    failures.push(`${file} Open evidence must not list controlsVerified as if passed`);
  }
  return true;
}

function checkReleaseOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem === 'final-validation-runner') {
    return checkGenericOpenBlockedEvidence(file, evidence, new Set(['blocked', 'not_verified']));
  }
  if (evidence.evidenceItem === 'audit-chain-live-validation') {
    return checkGenericOpenBlockedEvidence(file, evidence, new Set(['not_run', 'blocked']));
  }
  if (!new Set(['deployment-smoke-validation', 'rollback-dry-run-validation']).has(evidence.evidenceItem)) return false;
  return checkGenericOpenBlockedEvidence(file, evidence, new Set(['failed']));
}

function checkProductionProviderOpenEvidence(file, evidence) {
  if (evidence.evidenceItem !== 'production-secrets-provider-stores' || evidence.status !== 'Open') return false;
  if (evidence.schema !== 'risck-comply.production-provider-runtime-evidence.v2') failures.push(file + ' has unexpected production provider evidence schema');
  if (evidence.outcome !== 'blocked') failures.push(file + ' Open provider evidence must have outcome blocked');
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  if (!hasValidRedactionText(evidence)) failures.push(file + ' missing redaction confirmation');
  if (evidence.valuesRedacted !== true) failures.push(file + ' Open provider evidence must confirm valuesRedacted');

  const runtimeContext = requireObject(file, evidence, 'runtimeContext');
  if (runtimeContext) {
    if (runtimeContext.repository !== 'renanescola40-afk/eurocomply_saas') failures.push(file + ' has unexpected provider evidence repository binding');
    if (runtimeContext.branch !== 'main') failures.push(file + ' Open provider evidence must be bound to main');
    if (!FULL_SHA.test(String(runtimeContext.commitSha ?? ''))) failures.push(file + ' Open provider evidence requires a full commit SHA');
    if (runtimeContext.environment !== 'production') failures.push(file + ' Open provider evidence must target production');
    if (runtimeContext.generatedByGithubActions !== true) failures.push(file + ' Open provider evidence must be generated by GitHub Actions');
  }

  requireArray(file, evidence, 'providersReviewed', 5);
  const providers = Array.isArray(evidence.providersReviewed) ? evidence.providersReviewed : [];
  const expectedProviderNames = ['github', 'vercel', 'supabase', 'stripe', 'sentry'];
  const observedProviderNames = providers.map((entry) => String(entry?.provider ?? ''));
  if (JSON.stringify(observedProviderNames) !== JSON.stringify(expectedProviderNames)) {
    failures.push(file + ' Open provider evidence must preserve the canonical five-provider order');
  }

  let blockedCount = 0;
  const expectedControlsVerified = [];
  for (const entry of providers) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      failures.push(file + ' contains invalid provider evidence entry');
      continue;
    }
    if (entry.environment !== 'production') failures.push(file + ' provider ' + String(entry.provider ?? 'unknown') + ' must target production');
    if (entry.status !== 'reviewed' && entry.status !== 'blocked') failures.push(file + ' provider ' + String(entry.provider ?? 'unknown') + ' has unsupported status');
    requireString(file, entry, 'evidenceLocation', 10);
    const checks = requireObject(file, entry, 'checks');
    const checkValues = checks ? Object.values(checks) : [];
    if (entry.status === 'reviewed') {
      if (checkValues.length === 0 || checkValues.some((value) => value !== true)) {
        failures.push(file + ' reviewed provider ' + String(entry.provider ?? 'unknown') + ' must have every check true');
      }
      expectedControlsVerified.push(String(entry.provider) + ' production provider configuration verified by protected runtime probe.');
    }
    if (entry.status === 'blocked') {
      blockedCount += 1;
      if (checkValues.length === 0 || checkValues.every((value) => value === true)) {
        failures.push(file + ' blocked provider ' + String(entry.provider ?? 'unknown') + ' must preserve at least one failed check');
      }
    }
  }
  if (blockedCount < 1) failures.push(file + ' Open provider evidence must contain at least one blocked provider');
  if (JSON.stringify(evidence.controlsVerified ?? []) !== JSON.stringify(expectedControlsVerified)) {
    failures.push(file + ' controlsVerified must list only providers whose protected checks all passed');
  }

  const integrity = requireObject(file, evidence, 'evidenceIntegrity');
  if (integrity) {
    for (const key of ['containsSensitiveValues', 'rawValuesStored', 'credentialsStored', 'providerResponseBodiesStored', 'decryptedProviderEnvironmentValuesStored', 'selectedNonSecretControlValuesStored']) {
      if (integrity[key] !== false) failures.push(file + ' provider evidence integrity field ' + key + ' must be false');
    }
    if (integrity.exactShaBound !== true) failures.push(file + ' Open provider evidence must remain exact-SHA bound');
  }
  return true;
}
function checkEnterpriseReleaseEnvOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-release-env-readiness' || evidence.status !== 'Open') return false;
  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['not_run', 'failed']))) return true;
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open enterprise release env evidence must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.rawUrlsStored !== false) failures.push(`${file} enterprise release env evidence must confirm raw URLs are not stored`);
  if (evidence.evidenceIntegrity?.authorizationHeaderStored !== false) failures.push(`${file} enterprise release env evidence must confirm Authorization headers are not stored`);
  if (evidence.evidenceIntegrity?.cookiesStored !== false) failures.push(`${file} enterprise release env evidence must confirm cookies are not stored`);
  return true;
}

function checkSupabaseOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'supabase-live-rls-validation' || evidence.status !== 'Open') return false;
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  if (evidence.outcome !== 'not_run' && evidence.outcome !== 'failed') failures.push(`${file} Open Supabase evidence must have outcome not_run or failed`);
  if (!String(evidence.productionGate ?? '').toLowerCase().includes('blocked')) failures.push(`${file} Open Supabase evidence must keep production blocked`);
  if (!String(evidence.completionRule ?? '').includes('run')) failures.push(`${file} Open Supabase evidence must include completion rule`);
  return true;
}

function checkGoogleOAuthOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'google-oauth-validation' || evidence.status !== 'Open') return false;
  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['not_run', 'failed']))) return true;
  if (!String(evidence.completionRule ?? '').toLowerCase().includes('google oauth provider proof')) {
    failures.push(`${file} Open Google OAuth evidence must include protected workflow completion rule`);
  }
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open Google OAuth evidence must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.managementTokenStored !== false) failures.push(`${file} Google OAuth evidence must confirm management token is not stored`);
  if (evidence.evidenceIntegrity?.projectReferenceStored !== false) failures.push(`${file} Google OAuth evidence must confirm project reference is not stored`);
  if (evidence.evidenceIntegrity?.rawProviderConfigStored !== false) failures.push(`${file} Google OAuth evidence must confirm raw provider config is not stored`);
  if (evidence.evidenceIntegrity?.customerDataStored !== false) failures.push(`${file} Google OAuth evidence must confirm customer data is not stored`);
  return true;
}

function checkStripeOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'stripe-billing-validation' || evidence.status !== 'Open') return false;
  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['not_run', 'failed']))) return true;
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open Stripe evidence must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) failures.push(`${file} Open Stripe evidence must confirm runtime proof was not invented`);
  if (evidence.evidenceIntegrity?.customerFacingProof !== false) failures.push(`${file} Open Stripe evidence must not be customer-facing proof`);
  if (evidence.runtimeProof?.executed !== false) failures.push(`${file} Open Stripe evidence must record that target runtime proof was not executed`);
  if (!String(evidence.completionRule ?? '').toLowerCase().includes('target')) failures.push(`${file} Open Stripe evidence must include a target-runtime completion rule`);
  return true;
}

function checkExternalReviewOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'external-security-review-or-pentest' || evidence.status !== 'Open') return false;
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  if (evidence.outcome !== 'not_started' && evidence.outcome !== 'not_run') failures.push(`${file} Open external review evidence must have outcome not_started or not_run`);
  if (!String(evidence.releaseGate ?? '').toLowerCase().includes('blocked')) failures.push(`${file} Open external review evidence must keep enterprise release blocked`);
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open external review evidence must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.realExternalReportAttached !== false) failures.push(`${file} Open external review evidence must confirm no real external report is attached`);
  return true;
}

function checkEnterpriseFinalReadinessOpenPlaceholder(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-final-readiness-validation' || evidence.status !== 'Open') return false;
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  if (evidence.outcome !== 'no_go') failures.push(`${file} Open enterprise final readiness evidence must have outcome no_go`);
  if (evidence.releaseDecision !== 'No-Go') failures.push(`${file} Open enterprise final readiness evidence must keep releaseDecision No-Go`);
  if (!String(evidence.productionGate ?? '').toLowerCase().includes('blocked')) failures.push(`${file} Open enterprise final readiness evidence must keep production blocked`);
  if (!String(evidence.completionRule ?? '').toLowerCase().includes('complete')) failures.push(`${file} Open enterprise final readiness evidence must include completion rule`);
  if (!evidence.blockingEvidence || typeof evidence.blockingEvidence !== 'object' || Array.isArray(evidence.blockingEvidence)) failures.push(`${file} Open enterprise final readiness evidence must document blockingEvidence`);
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open enterprise final readiness evidence must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.realRuntimeEvidenceAttached !== false) failures.push(`${file} Open enterprise final readiness evidence must confirm no real runtime evidence is attached`);
  if (evidence.evidenceIntegrity?.customerFacingProof !== false) failures.push(`${file} Open enterprise final readiness evidence must not be customer-facing proof`);
  return true;
}

function checkEnterpriseAuditOpenEvidence(file, evidence) {
  if (evidence.evidenceItem !== 'enterprise-10-10-audit' || evidence.status !== 'Open') return false;
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  requireArray(file, evidence, 'decisionReasons', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  if (evidence.outcome !== 'no_go') failures.push(`${file} Open enterprise audit evidence must have outcome no_go`);
  if (evidence.decision !== 'No-Go') failures.push(`${file} Open enterprise audit evidence must keep decision No-Go`);
  if (!String(evidence.releaseGate ?? '').toLowerCase().includes('blocked')) failures.push(`${file} Open enterprise audit evidence must keep releaseGate blocked`);
  if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) failures.push(`${file} enterprise audit evidence must confirm no sensitive values are stored`);
  if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) failures.push(`${file} enterprise audit evidence must confirm runtime proof was not invented`);
  if (Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length > 0) failures.push(`${file} Open enterprise audit evidence must not list controlsVerified as if passed`);
  return true;
}

function checkLegalRulesRuntimeEvidence(file, evidence) {
  if (evidence.evidenceItem !== 'legal-rules-validation') return false;
  if (evidence.schema !== 'risck-comply.legal-rules-runtime-evidence.v1') failures.push(`${file} has unexpected legal-rules evidence schema`);
  if (evidence.repository !== 'renanescola40-afk/eurocomply_saas') failures.push(`${file} has unexpected repository binding`);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  requireString(file, evidence, 'legalRulesVersion', 5);
  requireString(file, evidence, 'effectiveDate', 10);
  requireString(file, evidence, 'effectiveDateMeaning', 20);
  requireString(file, evidence, 'evidenceBoundary', 40);
  requireArray(file, evidence, 'sourceRegulations', 2);

  if (evidence.status === 'NOT_EXECUTED') {
    requireString(file, evidence, 'reviewer', 3);
    requireString(file, evidence, 'reviewedAt', 10);
    requireString(file, evidence, 'summary', 40);
    requireArray(file, evidence, 'evidenceLocations', 1);
    requireString(file, evidence, 'blocker', 40);
    if (evidence.outcome !== 'not_run') failures.push(`${file} legal-rules placeholder outcome must be not_run`);
    if (!hasBlockedGateText(evidence)) failures.push(`${file} legal-rules placeholder must keep production blocked`);
    if (evidence.deploymentUrl !== null || evidence.deploymentSha !== null) failures.push(`${file} legal-rules placeholder must not claim deployment provenance`);
    if (evidence.rulesDigest !== null || evidence.artifactSha256 !== null) failures.push(`${file} legal-rules placeholder must not claim runtime integrity`);
    if (!Array.isArray(evidence.testCases) || evidence.testCases.length !== 0) failures.push(`${file} legal-rules placeholder must not contain passed test cases`);
    if (!Array.isArray(evidence.requestIds) || evidence.requestIds.length !== 0) failures.push(`${file} legal-rules placeholder must not contain request ids`);
    if (evidence.countsForRuntimeCoverage !== false) failures.push(`${file} legal-rules placeholder must not count for runtime coverage`);
    if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} legal-rules placeholder must be marked placeholderOnly`);
    if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) failures.push(`${file} legal-rules placeholder must confirm runtime proof was not invented`);
    if (evidence.evidenceIntegrity?.customerFacingProof !== false) failures.push(`${file} legal-rules placeholder must not be customer-facing proof`);
    return true;
  }

  if (evidence.status !== 'PASS') {
    failures.push(`${file} legal-rules evidence status must be NOT_EXECUTED or PASS`);
    return true;
  }

  requireString(file, evidence, 'environment', 2);
  requireString(file, evidence, 'deploymentUrl', 8);
  requireString(file, evidence, 'deploymentSha', 40);
  requireString(file, evidence, 'timestamp', 10);
  requireArray(file, evidence, 'testCases', 8);
  requireArray(file, evidence, 'requestIds', 1);
  if (!FULL_SHA.test(String(evidence.deploymentSha ?? ''))) failures.push(`${file} deployed legal-rules evidence requires a full SHA`);
  if (!SHA256.test(String(evidence.rulesDigest ?? ''))) failures.push(`${file} legal-rules rulesDigest must be SHA-256`);
  if (!SHA256.test(String(evidence.artifactSha256 ?? ''))) failures.push(`${file} legal-rules artifactSha256 must be SHA-256`);
  if (evidence.environment === 'unknown') failures.push(`${file} deployed legal-rules evidence cannot use unknown environment`);
  try {
    const url = new URL(evidence.deploymentUrl);
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !local) failures.push(`${file} deployed legal-rules evidence requires HTTPS outside local development`);
    if (url.username || url.password || url.search || url.hash) failures.push(`${file} deployment URL must not contain credentials, query parameters or fragments`);
  } catch {
    failures.push(`${file} has invalid deployment URL`);
  }
  if (evidence.testCases.some((testCase) => testCase?.status !== 'PASS')) failures.push(`${file} contains a non-PASS legal-rules runtime test`);
  if (evidence.requestIds.some((requestId) => !/^[A-Za-z0-9._:-]{8,128}$/.test(String(requestId)))) failures.push(`${file} contains an unsanitized request id`);
  const { artifactSha256, ...withoutArtifactDigest } = evidence;
  if (artifactSha256 !== digest(withoutArtifactDigest)) failures.push(`${file} legal-rules artifact SHA-256 integrity check failed`);
  return true;
}

function checkTechnicalCloseoutConsolidated(file, evidence) {
  if (evidence.evidenceItem !== 'technical-closeout-consolidated') return false;
  if (!checkGenericOpenBlockedEvidence(file, evidence, new Set(['no_go']))) return true;
  if (evidence.schema !== 'risck-comply.technical-closeout-consolidated.v1') failures.push(`${file} has unexpected technical closeout schema`);
  if (evidence.repository !== 'renanescola40-afk/eurocomply_saas') failures.push(`${file} has unexpected repository binding`);
  if (evidence.releaseDecision !== 'NO_GO') failures.push(`${file} technical closeout must remain NO_GO while Open`);
  if (evidence.technicalComplete !== false || evidence.runtimeVerified !== false || evidence.operationallyValidated !== false) {
    failures.push(`${file} Open technical closeout must not claim technical, runtime or operational completion`);
  }
  requireArray(file, evidence, 'controls', 1);
  const counts = requireObject(file, evidence, 'counts');
  if (counts) {
    if (counts.totalControls !== evidence.controls.length) failures.push(`${file} technical closeout control count mismatch`);
    if (counts.exactShaRuntimePass !== 0) failures.push(`${file} Open technical closeout must have zero exact-SHA runtime pass controls`);
  }
  if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push(`${file} Open technical closeout must be marked placeholderOnly`);
  if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) failures.push(`${file} Open technical closeout must confirm runtime proof was not invented`);
  if (evidence.evidenceIntegrity?.customerFacingProof !== false) failures.push(`${file} Open technical closeout must not be customer-facing proof`);
  return true;
}

function checkCompleteEvidence(file, evidence) {
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  requireArray(file, evidence, 'controlsVerified', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
}

function checkExceptionEvidence(file, evidence) {
  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);
  if (!hasValidRedactionText(evidence)) failures.push(`${file} missing redaction confirmation`);
  const exception = requireObject(file, evidence, 'exception');
  if (!exception) return;
  requireString(file, exception, 'riskOwner', 3);
  requireString(file, exception, 'rationale', 20);
  requireArray(file, exception, 'compensatingControls', 1);
  requireString(file, exception, 'expiresAt', 10);
  requireString(file, exception, 'approvalReference', 5);
}

for (const file of listJsonFiles(evidenceDir)) {
  const evidence = JSON.parse(readFileSync(file, 'utf8'));
  if (!allowedItems.has(evidence.evidenceItem)) {
    failures.push(`${file} has unexpected evidenceItem: ${evidence.evidenceItem}`);
    continue;
  }
  if (checkReleaseOpenPlaceholder(file, evidence)) continue;
  if (checkProductionProviderOpenEvidence(file, evidence)) continue;
  if (checkEnterpriseReleaseEnvOpenPlaceholder(file, evidence)) continue;
  if (checkSupabaseOpenPlaceholder(file, evidence)) continue;
  if (checkGoogleOAuthOpenPlaceholder(file, evidence)) continue;
  if (checkStripeOpenPlaceholder(file, evidence)) continue;
  if (checkExternalReviewOpenPlaceholder(file, evidence)) continue;
  if (checkEnterpriseFinalReadinessOpenPlaceholder(file, evidence)) continue;
  if (checkEnterpriseAuditOpenEvidence(file, evidence)) continue;
  if (checkLegalRulesRuntimeEvidence(file, evidence)) continue;
  if (checkTechnicalCloseoutConsolidated(file, evidence)) continue;
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
console.log(`Validated ${listJsonFiles(evidenceDir).length} runtime evidence file(s).`);
