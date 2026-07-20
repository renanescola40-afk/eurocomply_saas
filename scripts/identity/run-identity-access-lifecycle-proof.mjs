#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const output = 'docs/security/evidence/runtime/identity-access-lifecycle-validation.json';
const env = (name) => String(process.env[name] ?? '').trim();
const required = ['PRODUCTION_URL','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','IDENTITY_PROOF_EMAIL_DOMAIN'];
const failures = [];
for (const name of required) if (!env(name)) failures.push(`missing_${name.toLowerCase()}`);

const checks = {
  protectedMainExecution: env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main',
  exactShaBound: /^[a-f0-9]{40}$/i.test(env('GITHUB_SHA')),
  explicitConfirmation: env('IDENTITY_PROOF_CONFIRMATION') === 'EXECUTE_IDENTITY_LIFECYCLE_PROOF',
};

const base = env('SUPABASE_URL').replace(/\/$/, '');
const headers = (token) => ({ apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const adminHeaders = { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' };
const password = `Aa!${randomBytes(18).toString('base64url')}`;
const email = `identity-proof-${Date.now()}-${randomBytes(5).toString('hex')}@${env('IDENTITY_PROOF_EMAIL_DOMAIN')}`;
let userId = null;
let accessToken = null;
let refreshToken = null;

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function requireNetwork(condition, failureCode) {
  if (!condition) throw new Error(failureCode);
}

async function validateOAuthCallback(production) {
  const response = await fetch(`${production}/auth/callback?code=invalid-proof-code`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
  });
  requireNetwork([302, 303, 307, 308, 400, 401].includes(response.status) && response.status !== 500, 'oauth_callback_not_fail_closed');
}

async function validateOidcDiscovery(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const document = await response.json().catch(() => null);
  requireNetwork(
    response.ok
      && /^https:\/\//.test(String(document?.issuer ?? ''))
      && /^https:\/\//.test(String(document?.authorization_endpoint ?? '')),
    'oidc_discovery_invalid',
  );
}

try {
  if (failures.length || !Object.values(checks).every(Boolean)) throw new Error('identity_preconditions_failed');

  const signup = await fetchJson(`${base}/auth/v1/signup`, {
    method: 'POST',
    headers: headers(env('SUPABASE_ANON_KEY')),
    body: JSON.stringify({ email, password }),
  });
  userId = signup.body?.user?.id ?? null;
  accessToken = signup.body?.access_token ?? null;
  requireNetwork(signup.response.ok && Boolean(userId), 'signup_validation_failed');
  checks.signupValidated = true;

  const login = await fetchJson(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(env('SUPABASE_ANON_KEY')),
    body: JSON.stringify({ email, password }),
  });
  accessToken = login.body?.access_token ?? accessToken;
  refreshToken = login.body?.refresh_token ?? null;
  requireNetwork(login.response.ok && Boolean(accessToken && refreshToken), 'login_validation_failed');
  checks.loginValidated = true;

  const refresh = await fetchJson(`${base}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(env('SUPABASE_ANON_KEY')),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  requireNetwork(refresh.response.ok && Boolean(refresh.body?.access_token), 'session_refresh_validation_failed');
  checks.sessionRefreshValidated = true;

  const recovery = await fetchJson(`${base}/auth/v1/recover`, {
    method: 'POST',
    headers: headers(env('SUPABASE_ANON_KEY')),
    body: JSON.stringify({ email }),
  });
  requireNetwork(recovery.response.ok, 'account_recovery_validation_failed');
  checks.accountRecoveryAccepted = true;

  const logout = await fetchJson(`${base}/auth/v1/logout`, { method: 'POST', headers: headers(accessToken) });
  requireNetwork(logout.response.ok, 'logout_validation_failed');
  checks.logoutValidated = true;

  const staleSession = await fetchJson(`${base}/auth/v1/user`, { headers: headers(accessToken) });
  requireNetwork(staleSession.response.status === 401 || staleSession.response.status === 403, 'session_revocation_validation_failed');
  checks.sessionRevocationValidated = true;

  await validateOAuthCallback(env('PRODUCTION_URL').replace(/\/$/, ''));
  checks.oauthCallbackFailsClosed = true;

  const oidcUrl = env('IDENTITY_PROOF_OIDC_DISCOVERY_URL');
  if (!oidcUrl) throw new Error('missing_identity_proof_oidc_discovery_url');
  await validateOidcDiscovery(oidcUrl);
  checks.oidcDiscoveryValidated = true;

  checks.adminMfaPolicyPresent = env('IDENTITY_ADMIN_MFA_REQUIRED') === 'true';
  checks.sensitiveStepUpPolicyPresent = env('IDENTITY_SENSITIVE_STEP_UP_REQUIRED') === 'true';
  checks.organizationOnboardingProofPresent = env('IDENTITY_ORGANIZATION_ONBOARDING_VALIDATED') === 'true';

  if (!Object.values(checks).every(Boolean)) failures.push('one_or_more_identity_checks_failed');
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_identity_failure');
} finally {
  if (userId) {
    const cleanup = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: adminHeaders,
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    if (cleanup?.ok === true) {
      checks.disposableUserCleanup = true;
    } else {
      checks.disposableUserCleanup = false;
      failures.push('disposable_user_cleanup_failed');
    }
  } else {
    checks.disposableUserCleanup = false;
  }
}

const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const canonicalChecks = {
  protectedMainExecution: checks.protectedMainExecution === true,
  exactShaBound: checks.exactShaBound === true,
  explicitConfirmation: checks.explicitConfirmation === true,
  signupValidated: checks.signupValidated === true,
  loginValidated: checks.loginValidated === true,
  sessionRefreshValidated: checks.sessionRefreshValidated === true,
  accountRecoveryAccepted: checks.accountRecoveryAccepted === true,
  logoutValidated: checks.logoutValidated === true,
  sessionRevocationValidated: checks.sessionRevocationValidated === true,
  oauthCallbackFailsClosed: checks.oauthCallbackFailsClosed === true,
  oidcDiscoveryValidated: checks.oidcDiscoveryValidated === true,
  adminMfaPolicyPresent: checks.adminMfaPolicyPresent === true,
  sensitiveStepUpPolicyPresent: checks.sensitiveStepUpPolicyPresent === true,
  organizationOnboardingProofPresent: checks.organizationOnboardingProofPresent === true,
  disposableUserCleanup: checks.disposableUserCleanup === true,
};
const evidence = {
  schema: 'risck-comply.identity-access-lifecycle-evidence.v2',
  evidenceItem: 'identity-access-lifecycle-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: env('GITHUB_SHA') || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks: canonicalChecks,
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    credentialsStored: false,
    emailStored: false,
    tokensStored: false,
    providerResponsesStored: false,
    networkStatusStored: false,
    networkHeadersStored: false,
    disposableAccountRemoved: canonicalChecks.disposableUserCleanup,
  },
  boundary: 'Synthetic disposable identity lifecycle validation. Network responses are validated and discarded before canonical evidence is assembled; no credentials, email address, tokens, callback parameters, status objects, headers, bodies or provider responses are stored.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
