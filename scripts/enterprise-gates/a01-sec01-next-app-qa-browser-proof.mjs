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
 * Legacy mode does NOT prove true expired JWT denial; extended mode tests natural expiry. No claim of SEC-01 PASS.
 */
import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { verifyQaSignedSessionId } from '../security/lib/qa-signed-session-id-proof.mjs';

const QA_REF = 'zrxrrfbllsxtleyxjpsz';
const QA_URL = 'https://' + QA_REF + '.supabase.co';
const LOCAL_URL = 'http://127.0.0.1:3101';
const EXPECTED_BRANCH = 'main';
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

async function isApiAuthResult(response, expectedStatus, expectedError) {
  if (response.status() !== expectedStatus) return false;
  try {
    const body = await response.json();
    return body && typeof body === 'object' &&
      !Array.isArray(body) && body.error === expectedError;
  } catch {
    return false;
  }
}


/**
 * Fail-closed, non-sensitive click classification. Only DOM booleans are read:
 * no credentials, browser errors, URLs, storage or request bodies enter proof.
 */
async function classifyRealSubmitFailure(button, prefix) {
  const code = (suffix) => prefix + '_submit_' + suffix;
  try {
    if (await button.count() !== 1) return code('missing_or_ambiguous');
    if (!await button.isVisible()) return code('hidden');
    if (!await button.isEnabled()) return code('disabled');
    const receivesEvents = await button.evaluate((node) => {
      const box = node.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      const target = node.ownerDocument.elementFromPoint(
        box.left + box.width / 2, box.top + box.height / 2);
      return target === node || (target !== null && node.contains(target));
    }, undefined, { timeout: 2500 });
    return receivesEvents ? code('action_failed') : code('obscured');
  } catch {
    return code('action_failed');
  }
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
let failureDetail = null;
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
    // Explicit ordinary desktop viewport: keep the sign-in form usable without
    // hiding real consent dialogs or forcing pointer events.
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: 'block',
    acceptDownloads: false,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  stage = 'unauthenticated_api_denied';
  const anonApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  check(stage, await isApiAuthResult(anonApi, 401, 'unauthorized'));

  stage = 'unauthenticated_profile_redirected';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'bad_password_denied_in_real_browser';
  // Use the identity-only destination for BOTH password attempts. The anonymous
  // profile redirect above has already been verified. Do not reload or remount
  // the form between the rejected attempt and the valid credential attempt.
  failureDetail = 'password_form_hydration_unavailable';
  await page.goto('/en/login?next=%2Fen%2Fmfa%3Fsetup%3D1', { waitUntil: 'domcontentloaded' });
  requireTrue(isLoginPath(page.url()), 'password_login_route_unavailable');
  // Login renders two independent forms (SSO and password). Scope all password
  // QA interactions to the only form with a password input: a generic "form
  // input[type=email]" selector resolves to both forms and fails Playwright strict mode.
  const passwordForm = page.locator('form:has(input[type="password"])');
  // URL navigation and server-rendered markup do not prove that React has
  // attached the submit handler. Wait for the post-hydration marker before
  // entering real QA credentials; do not fake or intercept provider responses.
  failureDetail = 'password_form_hydration_unavailable';
  await page.waitForFunction(
    () => Boolean(document.querySelector('form[data-auth-hydrated="true"] input[type="password"]')),
    undefined,
    { timeout: 60000 },
  );
  // First-visit users see the real, fixed-bottom analytics-consent dialog
  // above parts of the login form. It may intercept a legitimate pointer
  // click on the password submit button. Handle this just like a real user:
  // explicitly DECLINE optional analytics, and verify that the dialog closes.
  // Never force-click, hide DOM elements, mock requests or pre-seed consent.
  failureDetail = 'analytics_consent_decline_unavailable';
  const consentDialog = page.getByRole('dialog', {
    name: 'Privacy-first product analytics',
  });
  await consentDialog.waitFor({ state: 'visible', timeout: 30000 });
  await consentDialog.getByRole('button', { name: 'Decline', exact: true })
    .click({ noWaitAfter: true });
  await consentDialog.waitFor({ state: 'hidden', timeout: 15000 });
  failureDetail = 'analytics_consent_not_denied';
  requireTrue(
    await page.evaluate(() =>
      window.localStorage.getItem('risckcomply.analytics.consent') === 'denied'),
    'analytics_consent_not_denied',
  );
  // The main auth flow still requires the actual pointer action, genuine
  // Supabase provider response, visible error and no session cookie.
  failureDetail = 'password_form_email_input_unavailable';
  await passwordForm.locator('input[type="email"]').fill(email);
  failureDetail = 'password_form_password_input_unavailable';
  await passwordForm.locator('input[type="password"]').fill(password + 'wrong');
  // Observe the actual QA provider denial before judging the browser UI.
  // Never retain request bodies, user identities or provider response text.
  failureDetail = 'invalid_password_provider_response_missing';
  const isPasswordRequest = (request) => {
    const url = new URL(request.url());
    return url.origin === QA_URL && url.pathname === '/auth/v1/token' &&
      url.searchParams.get('grant_type') === 'password' && request.method() === 'POST';
  };
  let requestSent = false;
  let requestFailed = false;
  const observeRequest = (request) => {
    if (isPasswordRequest(request)) requestSent = true;
  };
  const observeRequestFailure = (request) => {
    if (isPasswordRequest(request)) requestFailed = true;
  };
  page.on('request', observeRequest);
  page.on('requestfailed', observeRequestFailure);
  let deniedResponse;
  try {
    const response = page.waitForResponse(
      (response) => isPasswordRequest(response.request()),
      { timeout: 30000 },
    ).catch(() => null);
    // Playwright click waits for implicit navigation by default. The real
    // Supabase denial is observed separately below, so do not conflate a
    // navigation wait timeout with an unavailable login submit control.
    // Keep real pointer actionability checks (never force-click or mock auth).
    failureDetail = 'invalid_password_submit_unavailable';
    const invalidSubmit = passwordForm.locator('button[type="submit"]');
    try {
      await invalidSubmit.click({ noWaitAfter: true });
    } catch {
      failureDetail = await classifyRealSubmitFailure(invalidSubmit, 'invalid_password');
      throw new Error('invalid_password_click_failed');
    }
    deniedResponse = await response;
    if (!deniedResponse) {
      failureDetail = requestFailed ? 'invalid_password_request_failed'
        : requestSent ? 'invalid_password_provider_response_missing'
          : 'invalid_password_request_not_sent';
      throw new Error(failureDetail);
    }
  } finally {
    page.off('request', observeRequest);
    page.off('requestfailed', observeRequestFailure);
  }
  failureDetail = 'invalid_password_provider_denial_unexpected';
  requireTrue([400, 401, 403].includes(deniedResponse.status()), 'unexpected_invalid_password_status');
  let denialCode = null;
  try {
    const payload = await deniedResponse.json();
    denialCode = payload?.code ?? payload?.error_code ?? null;
  } catch {
    // Missing or unparseable denial proof must fail closed.
  }
  requireTrue(denialCode === 'invalid_credentials', 'unexpected_invalid_password_error_code');
  // The page can contain independent live regions from OAuth, SSO, sonner,
  // and the password form. An unscoped role=alert locator does not prove that
  // the INVALID-PASSWORD UI error is shown; it can also fail strict matching
  // when unrelated alerts exist. Match the public generic error exactly,
  // while preserving a visible, real browser assertion (no mocked response).
  failureDetail = 'invalid_password_ui_alert_missing';
  const genericDenialText = 'Could not sign in. Check your details and try again.';
  const passwordDenial = page.getByRole('alert').filter({ hasText: genericDenialText });
  let denialVisible = false;
  try {
    await passwordDenial.waitFor({ state: 'visible', timeout: 30000 });
    denialVisible = await passwordDenial.count() === 1;
  } catch {
    // Classify the missing UI without recording DOM text, URLs, user identifiers,
    // passwords, cookies, access tokens or provider response payloads.
  }
  if (!denialVisible) {
    if (!isLoginPath(page.url())) {
      failureDetail = 'invalid_password_ui_unexpected_navigation';
    } else if (await passwordForm.count() !== 1) {
      failureDetail = 'invalid_password_ui_form_missing';
    } else if (await passwordForm.locator('button[type="submit"]').isDisabled()) {
      failureDetail = 'invalid_password_ui_auth_pending';
    } else {
      const matches = await passwordDenial.count();
      const alerts = await page.getByRole('alert').count();
      failureDetail = matches > 1 ? 'invalid_password_ui_alert_ambiguous'
        : matches === 1 ? 'invalid_password_ui_alert_hidden'
          : alerts > 0 ? 'invalid_password_ui_alert_text_mismatch'
            : 'invalid_password_ui_alert_absent';
    }
    throw new Error('invalid_password_ui_proof_missing');
  }
  failureDetail = 'invalid_password_session_or_route_not_denied';
  const invalidPasswordCookies = (await context.cookies(LOCAL_URL))
    .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
  check(stage, isLoginPath(page.url()) && invalidPasswordCookies.length === 0);
  failureDetail = null;

  stage = 'real_browser_password_login';
  // Prove the rejected attempt released the real password form before retrying.
  failureDetail = 'valid_password_form_not_ready';
  await page.waitForFunction(
    () => {
      const button = document.querySelector('form[data-auth-hydrated="true"]:has(input[type="password"]) button[type="submit"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    },
    undefined,
    { timeout: 30000 },
  );

  // Retain the same hydrated form and the user-selected privacy preference.
  // A second full navigation can recreate transient overlays and reset focus.
  failureDetail = 'valid_password_identity_route_unavailable';
  requireTrue(isLoginPath(page.url()) &&
    new URL(page.url()).searchParams.get('next') === '/en/mfa?setup=1',
    'valid_password_login_route_unavailable');
  failureDetail = 'analytics_consent_not_denied';
  await consentDialog.waitFor({ state: 'hidden', timeout: 15000 });
  requireTrue(await page.evaluate(() =>
    window.localStorage.getItem('risckcomply.analytics.consent') === 'denied'),
    'analytics_consent_not_denied');

  failureDetail = 'valid_password_input_unavailable';
  await passwordForm.locator('input[type="email"]').fill(email);
  await passwordForm.locator('input[type="password"]').fill(password);

  const validSubmit = passwordForm.locator('button[type="submit"]');
  // Use the actual scroll/actionability path, never a forced click or DOM
  // dispatch. A covered button remains a genuine failure.
  failureDetail = 'valid_password_submit_unavailable';
  try {
    await validSubmit.scrollIntoViewIfNeeded({ timeout: 15000 });
  } catch {
    failureDetail = await classifyRealSubmitFailure(validSubmit, 'valid_password');
    throw new Error('valid_password_scroll_failed');
  }
  let validRequestSent = false;
  let validRequestFailed = false;
  const observeValidRequest = (request) => {
    if (isPasswordRequest(request)) validRequestSent = true;
  };
  const observeValidRequestFailure = (request) => {
    if (isPasswordRequest(request)) validRequestFailed = true;
  };
  page.on('request', observeValidRequest);
  page.on('requestfailed', observeValidRequestFailure);
  let validResponse;
  try {
    const response = page.waitForResponse(
      (response) => isPasswordRequest(response.request()),
      { timeout: 45000 },
    ).catch(() => null);
    failureDetail = 'valid_password_submit_unavailable';
    try {
      await validSubmit.click({ noWaitAfter: true });
    } catch {
      failureDetail = await classifyRealSubmitFailure(validSubmit, 'valid_password');
      throw new Error('valid_password_click_failed');
    }
    validResponse = await response;
    if (!validResponse) {
      failureDetail = validRequestFailed ? 'valid_password_request_failed'
        : validRequestSent ? 'valid_password_provider_response_missing'
          : 'valid_password_request_not_sent';
      throw new Error(failureDetail);
    }
  } finally {
    page.off('request', observeValidRequest);
    page.off('requestfailed', observeValidRequestFailure);
  }

  // Real provider success is necessary, but is not sufficient to prove a
  // usable application session. Never read or persist its token payload.
  failureDetail = 'valid_password_provider_denied';
  requireTrue(validResponse.status() === 200, 'valid_password_provider_denied');
  failureDetail = 'valid_password_navigation_failed';
  await page.waitForFunction(
    () => window.location.pathname === '/en/mfa' &&
      new URLSearchParams(window.location.search).get('setup') === '1',
    undefined,
    { timeout: 60000 },
  );
  failureDetail = 'valid_password_session_cookie_missing';
  const loginSessionCookies = (await context.cookies(LOCAL_URL))
    .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
  check(stage, loginSessionCookies.length > 0);
  failureDetail = null;

  stage = 'authenticated_api_identity_distinguished';
  // The current-organization RPC requires live AAL2 even for an empty
  // membership result. A password-only AAL1 session is not sufficient.
  // Enroll through the actual browser UI; never inject a session or use admin
  // credentials to authenticate the application. The factor is disposable.
  failureDetail = 'signed_api_mfa_enrollment_unavailable';
  const { generateTotpCode } = await import('../security/run-step-up-mfa-runtime-validation.mjs');
  await page.getByRole('button', { name: 'Set up authenticator app', exact: true }).click();
  const manualKey = page.getByText(/^Manual key: [A-Z2-7]+=*$/i);
  await manualKey.waitFor({ state: 'visible', timeout: 30000 });
  const totpSecret = (await manualKey.textContent())?.replace(/^Manual key: /i, '').trim();
  requireTrue(Boolean(totpSecret) && /^[A-Z2-7]+=*$/i.test(totpSecret), 'signed_api_mfa_enrollment_unavailable');

  failureDetail = 'signed_api_mfa_verification_unavailable';
  const remainingMs = 30000 - (Date.now() % 30000);
  if (remainingMs < 6000) await delay(remainingMs + 200);
  await page.getByRole('textbox', { name: 'Verification code' }).fill(generateTotpCode(totpSecret));
  const mfaResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === QA_URL &&
      /^\/auth\/v1\/factors\/[0-9a-f-]+\/verify$/i.test(url.pathname) &&
      response.request().method() === 'POST';
  }, { timeout: 45000 }).catch(() => null);
  await page.getByRole('button', { name: 'Verify MFA and continue', exact: true }).click({ noWaitAfter: true });
  const mfaResponse = await mfaResponsePromise;
  requireTrue(mfaResponse?.status() === 200, 'signed_api_mfa_verification_unavailable');

  // Verify the provider-issued token in memory only, using the existing
  // signature/issuer/expiry/session_id and same-user proof. No payload or
  // token is written to evidence. The publishable key is sufficient.
  failureDetail = 'signed_api_mfa_signed_session_unverified';
  const { access_token: aal2Token } = await mfaResponse.json();
  const identityClient = createClient(QA_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  requireTrue(await verifyQaSignedSessionId(identityClient.auth, aal2Token, userId, 'aal2'),
    'signed_api_mfa_signed_session_unverified');

  // Wait for the real browser SDK to replace the session cookie; never
  // manufacture or inject an authenticated cookie. The protected API must
  // still independently verify its own session and the AAL2 RPC result.
  failureDetail = 'signed_api_mfa_cookie_not_updated';
  let cookieUpdated = false;
  for (let attempt = 0; attempt < 40 && !cookieUpdated; attempt++) {
    const current = (await context.cookies(LOCAL_URL))
      .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
    cookieUpdated = current.length > 0 && (current.length !== loginSessionCookies.length ||
      current.some((cookie) => !loginSessionCookies.some((prior) => prior.name === cookie.name && prior.value === cookie.value)));
    if (!cookieUpdated) await delay(250);
  }
  requireTrue(cookieUpdated, 'signed_api_mfa_cookie_not_updated');

  failureDetail = 'signed_api_identity_unavailable';
  const authApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  // The disposable user has NO organization or paid license; 403 is expected,
  // and no AI-system records are read or written. A generic denial is NOT PASS.
  const apiStatus = authApi.status();
  failureDetail = apiStatus === 401 ? 'signed_api_http_401'
    : apiStatus === 403 ? 'signed_api_http_403_unexpected_body'
    : apiStatus === 500 ? 'signed_api_http_500'
    : apiStatus === 503 ? 'signed_api_http_503'
    : 'signed_api_http_unexpected';
  check(stage, await isApiAuthResult(authApi, 403, 'organization_required'));
  failureDetail = null;

  stage = 'authenticated_private_profile_available';
  failureDetail = 'profile_navigation_unavailable';
  const profileResponse = await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  failureDetail = 'profile_auth_upstream_unavailable';
  requireTrue(profileResponse?.status() !== 503, 'profile_auth_upstream_unavailable');
  failureDetail = 'profile_session_redirected';
  requireTrue(new URL(page.url()).pathname === '/en/profile', 'profile_session_redirected');
  failureDetail = 'profile_response_unavailable';
  requireTrue(profileResponse?.status() === 200, 'profile_response_unavailable');
  failureDetail = 'profile_signout_control_unavailable';
  await page.getByRole('button', { name: /^sign out$/i }).waitFor({ state: 'visible', timeout: 45000 });
  check(stage, new URL(page.url()).pathname === '/en/profile');
  failureDetail = null;

  // SEC-01 / PR #2738: a legitimate SIGNED_IN session must never act as
  // PASSWORD_RECOVERY provenance. Test the real browser and QA Auth session.
  stage = 'signed_in_session_recovery_form_denied';
  await page.goto('/en/reset-password', { waitUntil: 'domcontentloaded' });
  await page.getByRole('alert').filter({ hasText: /invalid or expired/i })
    .waitFor({ state: 'visible', timeout: 45000 });
  const ordinarySessionCookies = (await context.cookies(LOCAL_URL))
    .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
  check(stage, ordinarySessionCookies.length > 0 &&
    await page.locator('input[type="password"]').count() === 0);
  // UI denial must not silently sign out an otherwise valid user.
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^sign out$/i })
    .waitFor({ state: 'visible', timeout: 45000 });


  if (process.env.SEC01_APP_NATURAL_EXPIRY_PROOF === 'true') {
    const cookieName = 'sb-' + QA_REF + '-auth-token';
    const authCookies = async () => (await context.cookies(LOCAL_URL))
      .filter(c => c.name === cookieName || c.name.startsWith(cookieName + '.'));
    function readBrowserSession(cookies) {
      const ordered = [...cookies].sort((a,b) =>
        Number(a.name.slice(cookieName.length + 1)) - Number(b.name.slice(cookieName.length + 1)));
      requireTrue(ordered.length > 0 && (ordered.length === 1 && ordered[0].name === cookieName ||
        ordered.every((c,i) => c.name === cookieName + '.' + i)), 'expiry_cookie_chunks_invalid');
      const raw = ordered.map(c => c.value).join('');
      requireTrue(raw.startsWith('base64-'), 'expiry_cookie_encoding_unsupported');
      const session = JSON.parse(Buffer.from(raw.slice(7), 'base64url').toString('utf8'));
      requireTrue(typeof session.access_token === 'string' &&
        typeof session.refresh_token === 'string' && session.refresh_token.length > 0,
        'expiry_cookie_session_invalid');
      return { ordered, session };
    }
    function isolatedCookieHeader(snapshot, accessToken) {
      // Negative-only isolation. Preserve the original access JWT except in
      // the separately labelled invalid-signature test. Never use a real
      // refresh token in these requests or mutate the live browser cookie jar.
      const invalidRefresh = randomBytes(snapshot.session.refresh_token.length).toString('hex')
        .slice(0,snapshot.session.refresh_token.length);
      requireTrue(invalidRefresh !== snapshot.session.refresh_token,'expiry_refresh_isolation_invalid');
      const encoded = 'base64-' + Buffer.from(JSON.stringify({
        ...snapshot.session, access_token: accessToken, refresh_token: invalidRefresh,
      })).toString('base64url');
      let offset = 0;
      const pairs = snapshot.ordered.map((c,i) => {
        const end = i === snapshot.ordered.length - 1 ? encoded.length : offset + c.value.length;
        const value = encoded.slice(offset,end);
        offset = end;
        requireTrue(value.length > 0 && value.length <= 3180,'expiry_cookie_chunk_size_invalid');
        return c.name + '=' + value;
      });
      requireTrue(offset === encoded.length,'expiry_cookie_chunk_size_invalid');
      return pairs.join('; ');
    }
    async function isolatedGet(path,cookie) {
      return fetch(LOCAL_URL + path,{headers:{cookie},redirect:'manual',
        signal:AbortSignal.timeout(60000)});
    }
    async function isolatedApi(response,status,error) {
      return response.status === status && (await response.json().catch(() => null))?.error === error;
    }
    async function isolatedProfileDenied(response) {
      const location = response.headers.get('location');
      const redirected = [301,302,303,307,308].includes(response.status) && Boolean(location) &&
        new URL(location,LOCAL_URL).origin === LOCAL_URL &&
        isLoginPath(new URL(location,LOCAL_URL).toString());
      await response.body?.cancel().catch(() => {});
      return redirected;
    }
    stage = 'genuine_unexpired_cookie_without_refresh_accepted';
    failureDetail = 'expiry_cookie_capture_or_preexpiry_control_failed';
    // Unload the page so its browser SDK does not renew the access token
    // in the background. Retain the real browser cookie jar in memory.
    await page.goto('about:blank');
    const captured = readBrowserSession(await authCookies());
    const originalToken = captured.session.access_token;
    requireTrue(await verifyQaSignedSessionId(identityClient.auth,originalToken,userId,'aal2'),
      'expiry_original_signature_unverified');
    const originalClaims = (await identityClient.auth.getClaims(originalToken)).data?.claims;
    const exp = originalClaims?.exp;
    requireTrue(Number.isSafeInteger(exp) && exp * 1000 - Date.now() > 120000 &&
      exp * 1000 - Date.now() <= 70 * 60 * 1000,'expiry_wait_outside_bound');
    const negativeCookie = isolatedCookieHeader(captured,originalToken);
    const beforeApi = await isolatedGet('/api/ai-systems',negativeCookie);
    const beforeProfile = await isolatedGet('/en/profile',negativeCookie);
    const profileText = await beforeProfile.text();
    check(stage,await isolatedApi(beforeApi,403,'organization_required') &&
      beforeProfile.status === 200 && profileText.includes('Workspace access unavailable'));

    stage = 'invalid_signature_cookie_denied';
    failureDetail = 'expiry_invalid_signature_denial_failed';
    const parts = originalToken.split('.');
    requireTrue(parts.length === 3 && parts[2].length > 0,'expiry_token_shape_invalid');
    parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    const tampered = isolatedCookieHeader(captured,parts.join('.'));
    check(stage,await isolatedApi(await isolatedGet('/api/ai-systems',tampered),401,'unauthorized') &&
      await isolatedProfileDenied(await isolatedGet('/en/profile',tampered)));

    stage = 'genuine_access_jwt_naturally_expired_provider_denied';
    failureDetail = 'expiry_provider_rejection_not_proven';
    // No revocation, forged expiration, clock manipulation or global TTL
    // change. Wait for the actual verified signed exp plus bounded skew.
    await delay(Math.max(0,exp * 1000 + 90000 - Date.now()));
    requireTrue(Math.floor(Date.now()/1000) > exp,'expiry_clock_not_elapsed');
    const expired = await identityClient.auth.getUser(originalToken);
    const expiredError = expired.error;
    check(stage,!expired.data?.user && [400,401,403].includes(expiredError?.status) &&
      /expired|expiration/i.test(String(expiredError?.message || '')));

    stage = 'expired_access_jwt_no_refresh_app_api_denied';
    failureDetail = 'expiry_application_denial_failed';
    // Exactly the same header accepted before the natural expiration.
    check(stage,await isolatedApi(await isolatedGet('/api/ai-systems',negativeCookie),401,'unauthorized') &&
      await isolatedProfileDenied(await isolatedGet('/en/profile',negativeCookie)));

    stage = 'genuine_refresh_replaces_cookie_and_preserves_signed_session';
    failureDetail = 'expiry_real_refresh_cookie_contract_failed';
    const retained = readBrowserSession(await authCookies());
    requireTrue(retained.session.access_token === originalToken &&
      retained.session.refresh_token === captured.session.refresh_token,'expiry_browser_session_changed_while_waiting');
    const refreshedApi = await context.request.get('/api/ai-systems',{failOnStatusCode:false});
    const fresh = readBrowserSession(await authCookies());
    const freshToken = fresh.session.access_token;
    requireTrue(freshToken !== originalToken &&
      await verifyQaSignedSessionId(identityClient.auth,freshToken,userId,'aal2'),'expiry_refreshed_signature_unverified');
    const newClaims = (await identityClient.auth.getClaims(freshToken)).data?.claims;
    check(stage,await isApiAuthResult(refreshedApi,403,'organization_required') &&
      newClaims?.session_id === originalClaims.session_id && newClaims?.exp > exp &&
      fresh.ordered.some(c => !captured.ordered.some(old => old.name === c.name && old.value === c.value)));
    await page.goto('/en/profile',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:/^sign out$/i}).waitFor({state:'visible',timeout:45000});
    failureDetail = null;
  }

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
  check(stage, await isApiAuthResult(afterLogoutApi, 401, 'unauthorized'));

  stage = 'after_logout_private_profile_denied';
  await page.goto('/en/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => isLoginPath(url.toString()), { timeout: 45000 });
  check(stage, isLoginPath(page.url()));

  stage = 'revoked_cookie_replay_api_denied';
  await context.addCookies(staleCookies);
  const replayedCookies = await context.cookies(LOCAL_URL);
  requireTrue(
    staleCookies.every((cookie) => replayedCookies.some((candidate) =>
      candidate.name === cookie.name && candidate.value === cookie.value)),
    'revoked_cookies_not_actually_replayed',
  );
  const replayApi = await context.request.get('/api/ai-systems', { failOnStatusCode: false });
  check(stage, await isApiAuthResult(replayApi, 401, 'unauthorized'));

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
  // A fixed, non-sensitive step code improves failure diagnosis without
  // recording auth credentials, token material, raw errors or network payloads.
  failure_detail: failedStage ? failureDetail : null,
  qa_cleanup_verified: cleaned,
  emails_sent: 0,
  required_but_not_proven: [
    ...(checks.some(c => c.name === 'expired_access_jwt_no_refresh_app_api_denied' && c.status === 'PASS') ? [] : ['true_expired_signed_access_jwt_denial_at_app_and_api']),
    'qualified_independent_review',
    'official_source_sha_and_ledger_acceptance',
  ],
  gate: 'NOT_ACCEPTED',
  control: 'NOT_VERIFIED',
}));
process.exitCode = outcome === 'PARTIAL_APP_PASS' ? 2 : 1;
