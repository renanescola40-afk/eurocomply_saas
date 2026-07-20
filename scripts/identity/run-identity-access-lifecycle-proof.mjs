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

async function json(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

try {
  if (failures.length || !Object.values(checks).every(Boolean)) throw new Error('identity_preconditions_failed');

  const signup = await json(`${base}/auth/v1/signup`, { method: 'POST', headers: headers(env('SUPABASE_ANON_KEY')), body: JSON.stringify({ email, password }) });
  userId = signup.body?.user?.id ?? null;
  accessToken = signup.body?.access_token ?? null;
  checks.signupValidated = signup.response.ok && Boolean(userId);

  const login = await json(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(env('SUPABASE_ANON_KEY')), body: JSON.stringify({ email, password }) });
  accessToken = login.body?.access_token ?? accessToken;
  const refreshToken = login.body?.refresh_token ?? null;
  checks.loginValidated = login.response.ok && Boolean(accessToken && refreshToken);

  const refresh = await json(`${base}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: headers(env('SUPABASE_ANON_KEY')), body: JSON.stringify({ refresh_token: refreshToken }) });
  checks.sessionRefreshValidated = refresh.response.ok && Boolean(refresh.body?.access_token);

  const recovery = await json(`${base}/auth/v1/recover`, { method: 'POST', headers: headers(env('SUPABASE_ANON_KEY')), body: JSON.stringify({ email }) });
  checks.accountRecoveryAccepted = recovery.response.ok;

  const logout = await json(`${base}/auth/v1/logout`, { method: 'POST', headers: headers(accessToken) });
  checks.logoutValidated = logout.response.ok;

  const staleSession = await json(`${base}/auth/v1/user`, { headers: headers(accessToken) });
  checks.sessionRevocationValidated = staleSession.response.status === 401 || staleSession.response.status === 403;

  const production = env('PRODUCTION_URL').replace(/\/$/, '');
  const oauth = await fetch(`${production}/auth/callback?code=invalid-proof-code`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  checks.oauthCallbackFailsClosed = [302,303,307,308,400,401].includes(oauth.status) && oauth.status !== 500;

  const oidcUrl = env('IDENTITY_PROOF_OIDC_DISCOVERY_URL');
  if (oidcUrl) {
    const oidc = await fetch(oidcUrl, { signal: AbortSignal.timeout(20_000) });
    const document = await oidc.json().catch(() => null);
    checks.oidcDiscoveryValidated = oidc.ok && /^https:\/\//.test(String(document?.issuer ?? '')) && /^https:\/\//.test(String(document?.authorization_endpoint ?? ''));
  } else {
    checks.oidcDiscoveryValidated = false;
    failures.push('missing_identity_proof_oidc_discovery_url');
  }

  checks.adminMfaPolicyPresent = env('IDENTITY_ADMIN_MFA_REQUIRED') === 'true';
  checks.sensitiveStepUpPolicyPresent = env('IDENTITY_SENSITIVE_STEP_UP_REQUIRED') === 'true';
  checks.organizationOnboardingProofPresent = env('IDENTITY_ORGANIZATION_ONBOARDING_VALIDATED') === 'true';

  if (!Object.values(checks).every(Boolean)) failures.push('one_or_more_identity_checks_failed');
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_identity_failure');
} finally {
  if (userId) {
    const cleanup = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: adminHeaders, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    checks.disposableUserCleanup = cleanup?.ok === true;
    if (!checks.disposableUserCleanup) failures.push('disposable_user_cleanup_failed');
  } else {
    checks.disposableUserCleanup = false;
  }
}

const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.identity-access-lifecycle-evidence.v1',
  evidenceItem: 'identity-access-lifecycle-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: env('GITHUB_SHA') || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks,
  failures: [...new Set(failures)],
  evidenceIntegrity: { credentialsStored: false, emailStored: false, tokensStored: false, providerResponsesStored: false, disposableAccountRemoved: checks.disposableUserCleanup === true },
  boundary: 'Synthetic disposable identity lifecycle validation. Canonical evidence stores no credentials, email address, tokens, callback parameters or provider responses.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
