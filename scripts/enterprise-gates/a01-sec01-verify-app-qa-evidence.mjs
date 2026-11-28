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
  'authenticated_api_identity_distinguished',
  'authenticated_private_profile_available',
  'signed_in_session_recovery_form_denied',
  ...(process.env.SEC01_APP_NATURAL_EXPIRY_PROOF === 'true' ? ["genuine_unexpired_cookie_without_refresh_accepted","invalid_signature_cookie_denied","genuine_access_jwt_naturally_expired_provider_denied","expired_access_jwt_no_refresh_app_api_denied","genuine_refresh_replaces_cookie_and_preserves_signed_session"] : []),
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
  (process.env.SEC01_APP_NATURAL_EXPIRY_PROOF === 'true'
    ? !evidence.required_but_not_proven.includes('true_expired_signed_access_jwt_denial_at_app_and_api')
    : evidence.required_but_not_proven.includes('true_expired_signed_access_jwt_denial_at_app_and_api'));
const knownFailureStages = new Set([
  ...expectedNames, 'preflight', 'create_disposable_qa_user', 'launch_isolated_nextjs',
]);
const knownFailureDetails = new Set([
  'expiry_cookie_capture_or_preexpiry_control_failed', 'expiry_invalid_signature_denial_failed',
  'expiry_provider_rejection_not_proven', 'expiry_application_denial_failed', 'expiry_real_refresh_cookie_contract_failed',
  'analytics_consent_decline_unavailable', 'analytics_consent_not_denied',
  'password_form_hydration_unavailable',
  'password_form_email_input_unavailable', 'password_form_password_input_unavailable',
  'invalid_password_submit_unavailable', 'invalid_password_request_not_sent',
  'invalid_password_request_failed', 'invalid_password_provider_response_missing',
  'invalid_password_provider_denial_unexpected', 'invalid_password_ui_alert_missing',
  'invalid_password_ui_unexpected_navigation', 'invalid_password_ui_form_missing',
  'invalid_password_ui_auth_pending', 'invalid_password_ui_alert_ambiguous',
  'invalid_password_ui_alert_hidden', 'invalid_password_ui_alert_text_mismatch',
  'invalid_password_ui_alert_absent',
  'invalid_password_session_or_route_not_denied',
  'valid_password_input_unavailable', 'valid_password_submit_unavailable',
  'valid_password_form_not_ready', 'valid_password_identity_route_unavailable',
  'valid_password_request_failed', 'valid_password_provider_response_missing',
  'valid_password_request_not_sent', 'valid_password_provider_denied',
  'valid_password_navigation_failed', 'valid_password_session_cookie_missing',
  'invalid_password_submit_missing_or_ambiguous',
  'invalid_password_submit_hidden',
  'invalid_password_submit_disabled',
  'invalid_password_submit_obscured',
  'invalid_password_submit_action_failed',
  'valid_password_submit_missing_or_ambiguous',
  'valid_password_submit_hidden',
  'valid_password_submit_disabled',
  'valid_password_submit_obscured',
  'valid_password_submit_action_failed',
  'signed_api_mfa_enrollment_unavailable', 'signed_api_mfa_verification_unavailable',
  'signed_api_mfa_signed_session_unverified', 'signed_api_mfa_cookie_not_updated',
  'signed_api_http_401', 'signed_api_http_403_unexpected_body',
  'signed_api_http_500', 'signed_api_http_503', 'signed_api_http_unexpected',
  'signed_api_identity_unavailable', 'profile_navigation_unavailable',
  'profile_auth_upstream_unavailable', 'profile_session_redirected',
  'profile_response_unavailable', 'profile_signout_control_unavailable',
]);
const sameRun = evidence.schema === 'risck-sec01-next-app-qa-browser-proof-v1' &&
  evidence.execution === 'LOCAL_NEXT_APP_BROWSER_QA_AUTH' && evidence.source_sha === sha &&
  (!process.env.CIRCLE_SHA1 || process.env.CIRCLE_SHA1 === sha) && evidence.qa_ref === 'zrxrrfbllsxtleyxjpsz';
const observations = sameRun && Array.isArray(evidence.checks) &&
  evidence.checks.length <= expectedNames.length &&
  evidence.checks.every((check, index) => check?.name === expectedNames[index] && check.status === 'PASS')
  ? evidence.checks.length : 0;

console.log(JSON.stringify({
  evidence_type: 'SEC01_QA_APPLICATION_PARTIAL',
  source_sha: sha,
  qa_ref: 'zrxrrfbllsxtleyxjpsz',
  checks_passed: valid ? expectedNames.length : 0,
  observed_checks_passed: observations,
  failure_stage: sameRun && knownFailureStages.has(evidence.failure_stage) ? evidence.failure_stage : null,
  failure_detail: sameRun && knownFailureDetails.has(evidence.failure_detail) ? evidence.failure_detail : null,
  cleanup_verified: sameRun && evidence.qa_cleanup_verified === true,
  status: valid ? 'PROOF_VALIDATED_PARTIAL' : 'PROOF_FAILED',
  SEC01: 'NOT_VERIFIED',
  A01: 'NOT_ACCEPTED',
}));
if (!valid) process.exit(1);
