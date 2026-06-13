import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/step-up.ts';
const testPath = 'src/server/security/step-up.test.ts';
const docPath = 'docs/security/STEP_UP_AUTH.md';
const auditChainVerifierPath = 'src/app/api/audit/chain/verify/route.ts';

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

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);
if (doc) requireTokens(docPath, doc, docRequiredTokens);
if (auditChainVerifier) requireTokens(auditChainVerifierPath, auditChainVerifier, auditChainVerifierRequiredTokens);

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

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication: ok');
}
