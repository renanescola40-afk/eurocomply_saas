#!/usr/bin/env node
/**
 * A-01 / SEC-01: isolated Next.js application browser + API session proof.
 *
 * Unlike the Supabase-only provider runner, this starts the ACTUAL Next.js
 * application locally on 127.0.0.1, authenticates via the visible login form,
 * and verifies the protected profile and API denial before/after logout and
 * with saved, revoked session cookies replayed against the real app.
 *
 * Must run only in an isolated trusted QA executor. Never run against
 * Production, never pass the admin key to Next.js or the browser, never
 * send account-recovery emails, and never persist identities, passwords,
 * cookies, access JWTs or refresh JWTs in logs or artifacts.
 *
 * This does NOT prove true expired signed JWT denial; no claim of SEC-01 PASS.
 */
import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const QA_REF = 'zrxrrfbllsxtleyxjpsz';
const QA_URL = 'https://' + QA_REF + '.supabase.co';
const LOCAL_URL = 'http://127.0.0.1:3101';
const EXPECTED_BRANCH = 'qa/a01-sec01-provider-proof-20261107';
const SCHEMA = 'risck-sec01-next-app-qa-browser-proof-v1';
const checks = [];
let stage = 'preflight';

function requireTrue(value, code) {
  if (!value) throw new Error(code);
}

function check(name, value) {
  requireTrue(value, name + '_failed');
  checks.push({ name, status: 'PASS' });
}

function currentSha() {
  const value = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 10000,
  }).trim().toLowerCase();
  requireTrue(/^[a-f0-9]{40}$/.test(value), 'source_sha_invalid');
  return value;
}

function makeAdminClient(key) {
  return createClient(QA_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function startLocalApp() {
  // ALLOWLIST ONLY: never give the Next.js child the service-role/secret key.
  const cleanEnvironment = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: process.env.HOME || '/tmp',
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: QA_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    CI: 'true',
    TZ: 'UTC',
  };
  const child = spawn(process.execPath, [
    'node_modules/next/dist/bin/next',
    'dev', '--turbopack', '-H', '127.0.0.1', '-p', '3101',
  ], {
    cwd: process.cwd(),
    env: cleanEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Do not emit app logs: Next internals and auth traffic can contain secrets.
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});
  child.on('error', () => {});

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    requireTrue(child.exitCode === null, 'local_next_server_exited');
    try {
      const response = await fetch(LOCAL_URL + '/en/login', {
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        await response.body?.cancel().catch(() => {});
        return child;
      }
      await response.body?.cancel().catch(() => {});
    } catch {
      // The server may still be starting; do not output request details.
    }
    await delay(1000);
  }
  child.kill('SIGTERM');
  throw new Error('local_next_start_timeout');
}

function isLoginPath(url) {
  return new URL(url).pathname === '/en/login';
}

function ensureQaOnly() {
  requireTrue(process.env.SEC01_APP_EXECUTE === 'QA_ONLY_APP_BROWSER_PROOF', 'explicit_qa_app_flag_required');
  requireTrue(process.env.SEC01_QA_PROJECT_REF === QA_REF, 'approved_qa_ref_required');
  requireTrue(process.env.NEXT_PUBLIC_SUPABASE_URL === QA_URL, 'approved_qa_url_required');
  requireTrue(Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), 'qa_publishable_key_required');
  requireTrue(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), 'qa_secret_key_required');
  requireTrue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== process.env.SUPABASE_SERVICE_ROLE_KEY, 'keys_must_differ');
  requireTrue(!process.env.RESEND_API_KEY && !process.env.SMTP_HOST, 'outbound_email_credentials_forbidden');
  requireTrue(process.env.VERCEL_ENV !== 'production', 'production_vercel_env_forbidden');
  requireTrue(!String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_'), 'live_stripe_forbidden');
  requireTrue(process.env.E2E_ALLOW_SYNTHETIC_APP_WRITES !== 'true', 'app_write_toggle_forbidden');
  if (process.env.CIRCLECI === 'true') {
    requireTrue(process.env.CIRCLE_BRANCH === EXPECTED_BRANCH, 'branch_not_approved');
    requireTrue(process.env.CIRCLE_SHA1 === currentSha(), 'pipeline_sha_mismatch');
  }
}

const sha = currentSha();
const common = { schema: SCHEMA, source_sha: sha, qa_ref: QA_REF };
if (process.env.SEC01_APP_EXECUTE !== 'QA_ONLY_APP_BROWSER_PROOF') {
  console.log(JSON.stringify({
    ...common, execution: 'NOT_RUN', reason: 'explicit_QA_app_execution_flag_required',
    emails_sent: 0, gate: 'NOT_ACCEPTED', control: 'NOT_VERIFIED',
  }));
  process.exit(0);
}
ensureQaOnly();

let server = null;
let browser = null;
let context = null;
let userId = null;
let cleaned = false;
let failedStage = null;
let outcome = 'FAIL';

const email = 'sec01-app-qa-' + randomBytes(12).toString('hex') + '@example.invalid';
const password = 'QA!' + randomBytes(28).toString('base64url') + '1b';
const admin = makeAdminClient(process.env.SUPABASE_SERVICE_ROLE_KEY);

try {
  stage = 'create_disposable_qa_user';
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { sec01_synthetic: true, sec01_app_browser: true },
  });
  requireTrue(!created.error && Boolean(created.data.user?.id), 'create_qa_user_failed');
  userId = created.data.user.id;

  stage = 'launch_isolated_nextjs';
  server = await startLocalApp();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    baseURL: LOCAL_URL,
    serviceWorkers: 'block',
    acceptDownloads: false,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  stage = 'unauthenticated_api_denied';
  const anonApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  check(stage, anonApi.status() === 401);

  stage = 'unauthenticated_profile_redirected';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'bad_password_denied_in_real_browser';
  await page.locator('form input[type="email"]').fill(email);
  await page.locator('form input[type="password"]').fill(password + 'wrong');
  await page.locator('form button[type="submit"]').click();
  await page.getByRole('alert').waitFor({ state: 'visible', timeout: 30000 });
  check(stage, isLoginPath(page.url()));

  stage = 'real_browser_password_login';
  await page.locator('form input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/en/onboarding', { timeout: 60000 });
  check(stage, new URL(page.url()).pathname === '/en/onboarding');

  stage = 'authenticated_private_profile_available';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^sign out$/i }).waitFor({ state: 'visible', timeout: 45000 });
  check(stage, new URL(page.url()).pathname === '/en/profile');

  stage = 'authenticated_api_identity_distinguished';
  const authApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  // The disposable user has NO organization or paid license; 403 is expected,
  // and no AI-system records are read or written.
  check(stage, authApi.status() === 403);

  stage = 'capture_session_cookies_in_memory_only';
  const staleCookies = (await context.cookies(LOCAL_URL))
    .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
  check(stage, staleCookies.length > 0);

  stage = 'real_browser_logout';
  await page.getByRole('button', { name: /^sign out$/i }).click();
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'after_logout_api_denied';
  const afterLogoutApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  check(stage, afterLogoutApi.status() === 401);

  stage = 'after_logout_private_profile_denied';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'revoked_cookie_replay_api_denied';
  await context.addCookies(staleCookies);
  const replayApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  check(stage, replayApi.status() === 401);

  stage = 'revoked_cookie_replay_private_profile_denied';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'recovery_without_session_denied_in_browser';
  await context.clearCookies();
  await page.goto('/en/reset-password', { waitUntil: 'domcontentloaded' });
  await page.getByRole('alert').filter({ hasText: /invalid or expired/i })
    .waitFor({ state: 'visible', timeout: 45000 });
  check(stage, await page.locator('input[type="password"]').count() === 0);

  outcome = 'PARTIAL_APP_PASS';
} catch {
  failedStage = stage;
  outcome = 'FAIL';
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill('SIGTERM');
  if (userId) {
    try {
      const deleted = await admin.auth.admin.deleteUser(userId);
      const lookup = await admin.auth.admin.getUserById(userId);
      cleaned = !deleted.error && Boolean(lookup.error || !lookup.data.user);
    } catch {
      cleaned = false;
    }
  }
  if (!cleaned) outcome = 'FAIL';
}

console.log(JSON.stringify({
  ...common,
  execution: 'LOCAL_NEXT_APP_BROWSER_QA_AUTH',
  outcome,
  passed_checks: checks.length,
  checks,
  failure_stage: failedStage,
  qa_cleanup_verified: cleaned,
  emails_sent: 0,
  required_but_not_proven: [
    'true_expired_signed_access_jwt_denial_at_app_and_api',
    'qualified_independent_review',
    'official_source_sha_and_ledger_acceptance',
  ],
  gate: 'NOT_ACCEPTED',
  control: 'NOT_VERIFIED',
}));
process.exitCode = outcome === 'PARTIAL_APP_PASS' ? 2 : 1;
