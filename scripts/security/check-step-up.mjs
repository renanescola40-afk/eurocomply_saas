import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/step-up.ts';
const testPath = 'src/server/security/step-up.test.ts';
const docPath = 'docs/security/STEP_UP_AUTH.md';
const auditChainVerifierPath = 'src/app/api/audit/chain/verify/route.ts';
const challengePath = 'src/app/api/security/step-up/challenge/route.ts';

const helperRequiredTokens = [
  'STEP_UP_MAX_AGE_MS',
  'STEP_UP_SIGNING_SECRET_ENV',
  'STEP_UP_TOKEN_HEADER',
  'HIGH_RISK_ACTIONS',
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'audit_chain_export',
  'change_security_settings',
  'assessStepUp',
  'createStepUpToken',
  'assessStepUpToken',
  'requireStepUpForRequest',
  'stepUpRequiredResponse',
  'createHmac',
  'timingSafeEqual',
  'STEP_UP_SIGNING_SECRET',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'noStoreJson',
  'step_up_required',
  'missing_verification',
  'expired_verification',
  'invalid_verification',
  'missing_step_up_secret',
  'invalid_step_up_token',
  'step_up_token_scope_mismatch',
];

const testRequiredTokens = [
  'accepts a fresh verification timestamp',
  'creates and accepts a signed scoped step-up token',
  'accepts signed tokens through the reusable request helper',
  'rejects missing request helper tokens with no-store response',
  'rejects a tampered signed step-up token',
  'rejects a signed token scoped to another organization',
  'rejects a missing verification timestamp',
  'rejects an invalid verification timestamp',
  'rejects an expired verification timestamp',
  'returns no-store headers for step-up required responses',
];

const docRequiredTokens = [
  'Step-Up Authentication Standard',
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  '10 minutes',
  'step_up_required',
  'Rollout Plan',
];

const auditChainVerifierRequiredTokens = [
  'requireStepUpForRequest',
  'audit_chain_verify',
  'signed_hmac',
  'stepUp',
  'verifiedAt',
  'expiresAt',
];

const challengeRequiredTokens = [
  'assertTrustedOrigin',
  'getCurrentUser',
  'getCurrentOrganizationForUser',
  'noStoreJson',
  'step_up_provider_not_configured',
  'mfa_or_identity_provider_reauthentication',
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'change_security_settings',
];

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireTokens(path, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing step-up token: ${token}`);
    }
  }
}

console.log('EuroComply step-up authentication check');
console.log('---------------------------------------');

const helper = read(helperPath);
const test = read(testPath);
const doc = read(docPath);
const auditChainVerifier = read(auditChainVerifierPath);
const challenge = read(challengePath);

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);
if (doc) requireTokens(docPath, doc, docRequiredTokens);
if (auditChainVerifier) requireTokens(auditChainVerifierPath, auditChainVerifier, auditChainVerifierRequiredTokens);
if (challenge) requireTokens(challengePath, challenge, challengeRequiredTokens);

if (helper && helper.includes('NextResponse.json')) {
  failures.push(`${helperPath} must use noStoreJson instead of direct NextResponse.json`);
}

if (helper && !helper.includes('10 * 60 * 1000')) {
  failures.push(`${helperPath} must keep the default step-up window explicit and reviewable`);
}

if (auditChainVerifier && auditChainVerifier.includes('x-eurocomply-step-up-verified-at')) {
  failures.push(`${auditChainVerifierPath} must not trust raw timestamp step-up headers`);
}

if (auditChainVerifier && auditChainVerifier.includes('assessStepUpToken')) {
  failures.push(`${auditChainVerifierPath} should use requireStepUpForRequest instead of ad hoc token validation`);
}

if (auditChainVerifier && auditChainVerifier.indexOf('requireStepUpForRequest') > auditChainVerifier.indexOf('checkDistributedRateLimit')) {
  failures.push(`${auditChainVerifierPath} should enforce signed step-up before rate-limited sensitive processing`);
}

if (challenge && challenge.includes('createStepUpToken')) {
  failures.push(`${challengePath} must not issue step-up tokens until a real MFA or reauthentication provider is integrated`);
}

if (challenge && !challenge.includes('{ status: 501 }')) {
  failures.push(`${challengePath} must fail closed while the real step-up provider is not configured`);
}

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication: ok');
}
