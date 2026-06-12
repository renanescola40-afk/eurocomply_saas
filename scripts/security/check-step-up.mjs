import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/step-up.ts';
const testPath = 'src/server/security/step-up.test.ts';

const helperRequiredTokens = [
  'STEP_UP_MAX_AGE_MS',
  'HIGH_RISK_ACTIONS',
  'export_data',
  'manage_billing',
  'manage_team',
  'gdpr_delete',
  'audit_chain_verify',
  'audit_chain_export',
  'change_security_settings',
  'assessStepUp',
  'stepUpRequiredResponse',
  'noStoreJson',
  'step_up_required',
  'missing_verification',
  'expired_verification',
  'invalid_verification',
];

const testRequiredTokens = [
  'accepts a fresh verification timestamp',
  'rejects a missing verification timestamp',
  'rejects an invalid verification timestamp',
  'rejects an expired verification timestamp',
  'returns no-store headers for step-up required responses',
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

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);

if (helper && helper.includes('NextResponse.json')) {
  failures.push(`${helperPath} must use noStoreJson instead of direct NextResponse.json`);
}

if (helper && !helper.includes('10 * 60 * 1000')) {
  failures.push(`${helperPath} must keep the default step-up window explicit and reviewable`);
}

if (failures.length > 0) {
  console.error('Step-up authentication failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up authentication: ok');
}
