#!/usr/bin/env node
/**
 * A-01 / SEC-01: isolated Supabase QA provider proof, NEVER Production.
 *
 * This intentionally does not contact a Vercel deployment or send email.
 * Admin createUser and generateLink are QA-only operations, with service_role
 * held solely inside the trusted test executor (never in the browser/Preview).
 * It does NOT prove app/browser rejection or JWT expiry: those remain separate
 * mandatory acceptance criteria.
 *
 * Usage:
 *   SEC01_QA_EXECUTE=QA_ONLY_AUTH_PROOF \
 *   SEC01_QA_PROJECT_REF=zrxrrfbllsxtleyxjpsz \
 *   NEXT_PUBLIC_SUPABASE_URL=https://zrxrrfbllsxtleyxjpsz.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<QA_ONLY_KEY> \
 *   SUPABASE_SERVICE_ROLE_KEY=<QA_ONLY_SECRET_FROM_RUNNER> \
 *   node scripts/enterprise-gates/a01-sec01-supabase-qa-provider-proof.mjs
 *
 * Never paste keys into a shell command, PR, log, or retained artifact.
 * Configure secrets through a secure, isolated QA runner instead.
 */
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const QA_REF = 'zrxrrfbllsxtleyxjpsz';
const QA_URL = 'https://' + QA_REF + '.supabase.co';
const EXECUTION_LITERAL = 'QA_ONLY_AUTH_PROOF';
const results = [];
let stage = 'preflight';

function fail(code) { throw new Error(code); }
function requireTrue(value, code) { if (!value) fail(code); }
function check(name, value) {
  requireTrue(value, name + '_failed');
  results.push({ name, status: 'PASS' });
}
function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'risck-sec01-qa-only' } },
  });
}
function safeGitSha() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().toLowerCase();
    requireTrue(/^[a-f0-9]{40}$/.test(sha), 'git_sha_invalid');
    return sha;
  } catch {
    fail('git_sha_unavailable');
  }
}

const sha = safeGitSha();
const base = { schema: 'risck-sec01-qa-provider-proof-v1', source_sha: sha, qa_ref: QA_REF };
if (process.env.SEC01_QA_EXECUTE !== EXECUTION_LITERAL) {
  console.log(JSON.stringify({
    ...base, execution: 'NOT_RUN', reason: 'explicit_QA_execution_flag_required',
    server_only_service_role_required: true, emails_sent: 0,
    gate: 'NOT_ACCEPTED', control: 'NOT_VERIFIED',
  }));
  process.exit(0);
}

// Fail closed BEFORE constructing a Supabase client or making a network request.
requireTrue(process.env.SEC01_QA_PROJECT_REF === QA_REF, 'qa_project_ref_mismatch');
requireTrue(
  process.env.NEXT_PUBLIC_SUPABASE_URL === QA_URL,
  'qa_auth_hostname_mismatch',
);
requireTrue(process.env.VERCEL_ENV !== 'production', 'production_vercel_environment_denied');
requireTrue(!process.env.RESEND_API_KEY && !process.env.SMTP_HOST, 'outbound_email_environment_denied');
requireTrue(
  !String(process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_'),
  'live_stripe_environment_denied',
);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
requireTrue(Boolean(anonKey && serviceKey && anonKey !== serviceKey), 'qa_credentials_missing_or_equal');

const publicClient = client(QA_URL, anonKey);
const adminClient = client(QA_URL, serviceKey);
const email = 'sec01-qa-' + randomBytes(12).toString('hex') + '@example.invalid';
const firstPassword = 'QA!' + randomBytes(24).toString('base64url') + '3a';
const nextPassword = 'QA!' + randomBytes(24).toString('base64url') + '6b';
let userId = null;
let cleanupSucceeded = false;
let outcome = 'NOT_VERIFIED';
let stageFailure = null;
let postLogoutAccessTokenObservation = 'NOT_TESTED';

try {
  stage = 'create_synthetic_user';
  const created = await adminClient.auth.admin.createUser({
    email, password: firstPassword, email_confirm: true,
    app_metadata: { sec01_synthetic: true },
  });
  requireTrue(!created.error && created.data.user?.id, 'qa_admin_create_failed');
  userId = created.data.user.id;
  check(stage, true);

  stage = 'wrong_password_denied';
  const wrong = await publicClient.auth.signInWithPassword({
    email, password: firstPassword + 'invalid',
  });
  check(stage, Boolean(wrong.error && !wrong.data?.session));

  stage = 'valid_password_login';
  const login = await publicClient.auth.signInWithPassword({
    email, password: firstPassword,
  });
  check(stage, Boolean(!login.error && login.data.user?.id === userId &&
    login.data.session?.access_token && login.data.session?.refresh_token));

  stage = 'refresh_valid_session';
  const refreshed = await publicClient.auth.refreshSession();
  check(stage, Boolean(!refreshed.error && refreshed.data.session?.access_token &&
    refreshed.data.session?.refresh_token));
  const savedAccessToken = refreshed.data.session.access_token;
  const savedRefreshToken = refreshed.data.session.refresh_token;

  stage = 'global_logout';
  const logout = await publicClient.auth.signOut({ scope: 'global' });
  check(stage, !logout.error);

  stage = 'logout_clears_local_state';
  const afterLogout = await publicClient.auth.getSession();
  check(stage, Boolean(!afterLogout.error && !afterLogout.data.session));

  stage = 'revoked_refresh_token_denied';
  const replayClient = client(QA_URL, anonKey);
  const replay = await replayClient.auth.refreshSession({
    refresh_token: savedRefreshToken,
  });
  check(stage, Boolean(replay.error && !replay.data.session));

  // Provider observation ONLY. Supabase access JWTs may still work until exp.
  // This must NOT be scored as immediate server-side session revocation.
  stage = 'observe_access_token_after_logout';
  try {
    const probe = await fetch(QA_URL + '/auth/v1/user', {
      headers: { apikey: anonKey, Authorization: 'Bearer ' + savedAccessToken },
      signal: AbortSignal.timeout(10000),
    });
    postLogoutAccessTokenObservation = probe.ok ? 'PROVIDER_ACCEPTED' : 'PROVIDER_REJECTED';
    await probe.body?.cancel().catch(() => {});
  } catch {
    postLogoutAccessTokenObservation = 'PROVIDER_UNAVAILABLE';
  }

  stage = 'generate_recovery_without_email';
  const link = await adminClient.auth.admin.generateLink({ type: 'recovery', email });
  const tokenHash = link.data?.properties?.hashed_token;
  check(stage, Boolean(!link.error && tokenHash));

  stage = 'invalid_recovery_hash_denied';
  const invalid = await client(QA_URL, anonKey).auth.verifyOtp({
    token_hash: randomBytes(32).toString('hex'), type: 'recovery',
  });
  check(stage, Boolean(invalid.error && !invalid.data?.session));

  stage = 'valid_recovery_hash_accepted';
  const recoveryClient = client(QA_URL, anonKey);
  const recovery = await recoveryClient.auth.verifyOtp({
    token_hash: tokenHash, type: 'recovery',
  });
  check(stage, Boolean(!recovery.error && recovery.data.session?.access_token));

  stage = 'reused_recovery_hash_denied';
  const reuse = await client(QA_URL, anonKey).auth.verifyOtp({
    token_hash: tokenHash, type: 'recovery',
  });
  check(stage, Boolean(reuse.error && !reuse.data?.session));

  stage = 'recovery_updates_password';
  const updated = await recoveryClient.auth.updateUser({ password: nextPassword });
  check(stage, Boolean(!updated.error && updated.data.user?.id === userId));
  await recoveryClient.auth.signOut({ scope: 'global' });

  stage = 'old_password_denied';
  const oldPassword = await client(QA_URL, anonKey).auth.signInWithPassword({
    email, password: firstPassword,
  });
  check(stage, Boolean(oldPassword.error && !oldPassword.data?.session));

  stage = 'new_password_accepted';
  const newPassword = await client(QA_URL, anonKey).auth.signInWithPassword({
    email, password: nextPassword,
  });
  check(stage, Boolean(!newPassword.error && newPassword.data.session?.access_token));

  outcome = 'PARTIAL_PROVIDER_PASS';
} catch {
  stageFailure = stage;
  outcome = 'FAIL';
} finally {
  if (userId) {
    try {
      const removed = await adminClient.auth.admin.deleteUser(userId);
      const absent = await adminClient.auth.admin.getUserById(userId);
      cleanupSucceeded = !removed.error && Boolean(absent.error || !absent.data.user);
    } catch {
      cleanupSucceeded = false;
    }
  }
  if (!cleanupSucceeded) outcome = 'FAIL';
}

console.log(JSON.stringify({
  ...base,
  execution: 'QA_PROVIDER_RUNTIME',
  outcome,
  passed_checks: results.length,
  checks: results,
  failure_stage: stageFailure,
  qa_cleanup_verified: cleanupSucceeded,
  emails_sent: 0,
  post_logout_access_jwt: postLogoutAccessTokenObservation,
  required_but_not_proven: [
    'exact_SHA_local_or_preview_browser_and_protected_API_denial',
    'expired_access_token_protected_API_denial',
    'immediate_revocation_of_already_issued_access_JWT_if_required_by_contract',
    'qualified_independent_review_and_canonical_acceptance',
  ],
  gate: 'NOT_ACCEPTED',
  control: 'NOT_VERIFIED',
}));

// A PARTIAL_PROVIDER_PASS is explicitly not a complete SEC-01 PASS.
process.exitCode = outcome === 'PARTIAL_PROVIDER_PASS' ? 2 : 1;
