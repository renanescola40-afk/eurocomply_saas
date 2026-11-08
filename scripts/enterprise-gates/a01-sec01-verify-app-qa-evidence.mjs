#!/usr/bin/env node
/**
 * Verify strict, redacted output from the separate SEC-01 Next.js QA test.
 * This is PARTIAL runtime evidence only, NEVER formal SEC-01 acceptance.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const path = 'artifacts/enterprise-sec01/next-app-browser-proof.json';
const expectedNames = [
  'unauthenticated_api_denied',
  'unauthenticated_profile_redirected',
  'bad_password_denied_in_real_browser',
  'real_browser_password_login',
  'authenticated_private_profile_available',
  'authenticated_api_identity_distinguished',
  'capture_session_cookies_in_memory_only',
  'real_browser_logout',
  'after_logout_api_denied',
  'after_logout_private_profile_denied',
  'revoked_cookie_replay_api_denied',
  'revoked_cookie_replay_private_profile_denied',
  'recovery_without_session_denied_in_browser',
];

let evidence = null;
try {
  evidence = JSON.parse(readFileSync(path, 'utf8'));
} catch {
  console.error('SEC01 APP evidence missing or unreadable');
  process.exit(1);
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const expectedExit = Number(process.argv[2]);
const checksValid = Array.isArray(evidence.checks) &&
  evidence.checks.length === expectedNames.length &&
  expectedNames.every((name, index) =>
    evidence.checks[index]?.name === name &&
    evidence.checks[index]?.status === 'PASS');
const valid = expectedExit === 2 &&
  evidence.schema === 'risck-sec01-next-app-qa-browser-proof-v1' &&
  evidence.execution === 'LOCAL_NEXT_APP_BROWSER_QA_AUTH' &&
  evidence.source_sha === sha &&
  (!process.env.CIRCLE_SHA1 || evidence.source_sha === process.env.CIRCLE_SHA1) &&
  evidence.qa_ref === 'zrxrrfbllsxtleyxjpsz' &&
  evidence.outcome === 'PARTIAL_APP_PASS' &&
  evidence.passed_checks === expectedNames.length &&
  checksValid &&
  evidence.failure_stage === null &&
  evidence.qa_cleanup_verified === true &&
  evidence.emails_sent === 0 &&
  evidence.control === 'NOT_VERIFIED' &&
  evidence.gate === 'NOT_ACCEPTED' &&
  Array.isArray(evidence.required_but_not_proven) &&
  evidence.required_but_not_proven.includes(
    'true_expired_signed_access_jwt_denial_at_app_and_api');
console.log(JSON.stringify({
  evidence_type: 'SEC01_QA_APPLICATION_PARTIAL',
  source_sha: sha,
  qa_ref: 'zrxrrfbllsxtleyxjpsz',
  checks_passed: valid ? expectedNames.length : 0,
  cleanup_verified: evidence.qa_cleanup_verified === true,
  status: valid ? 'PROOF_VALIDATED_PARTIAL' : 'PROOF_FAILED',
  SEC01: 'NOT_VERIFIED',
  A01: 'NOT_ACCEPTED',
}));
if (!valid) process.exit(1);
