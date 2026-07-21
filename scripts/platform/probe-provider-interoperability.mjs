import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const outputArg = process.argv.find((value) => value.startsWith('--output='));
const outputPath = resolve(outputArg?.slice('--output='.length) || 'artifacts/platform-provider-interoperability.json');

const env = process.env;
const results = [];
const add = (provider, control, status, detail) => results.push({ provider, control, status, detail });

function configured(name, required = strict) {
  const value = (env[name] || '').trim();
  if (!value) add('configuration', name, required ? 'FAIL' : 'NOT_CONFIGURED', 'Value is not configured');
  return value;
}

async function request(url, options = {}) {
  return fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    ...options,
  });
}

async function probeSupabase() {
  const base = configured('NEXT_PUBLIC_SUPABASE_URL');
  const anon = configured('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!base || !anon) return;

  let origin;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS');
    origin = parsed.origin;
  } catch {
    add('supabase', 'url', 'FAIL', 'Supabase URL is malformed or not HTTPS');
    return;
  }

  try {
    const response = await request(`${origin}/auth/v1/settings`, {
      headers: { apikey: anon, authorization: `Bearer ${anon}`, accept: 'application/json' },
    });
    const payload = response.ok ? await response.json().catch(() => null) : null;
    add('supabase', 'auth-settings', response.ok ? 'PASS' : 'FAIL', `HTTP ${response.status}`);

    const providers = payload?.external || payload?.external_providers || {};
    const googleEnabled = Boolean(providers.google);
    add('supabase', 'google-provider', googleEnabled ? 'PASS' : strict ? 'FAIL' : 'NOT_PROVEN', googleEnabled ? 'Google OAuth provider reported enabled' : 'Google OAuth provider not reported enabled');

    const disableSignup = payload?.disable_signup;
    add('supabase', 'auth-contract', typeof disableSignup === 'boolean' ? 'PASS' : 'NOT_PROVEN', 'Auth settings endpoint returned a structured contract');
  } catch (error) {
    add('supabase', 'auth-settings', 'FAIL', `Probe failed: ${error.name || 'Error'}`);
  }
}

async function probeStripe() {
  const secret = configured('STRIPE_SECRET_KEY');
  if (!secret) return;
  if (!/^sk_(test|live)_/.test(secret)) {
    add('stripe', 'secret-shape', 'FAIL', 'Stripe secret key has an unexpected prefix');
    return;
  }

  try {
    const accountResponse = await request('https://api.stripe.com/v1/account', {
      headers: { authorization: `Bearer ${secret}`, accept: 'application/json' },
    });
    const account = accountResponse.ok ? await accountResponse.json().catch(() => null) : null;
    add('stripe', 'account-access', accountResponse.ok ? 'PASS' : 'FAIL', `HTTP ${accountResponse.status}`);
    if (accountResponse.ok) {
      add('stripe', 'account-mode', typeof account?.livemode === 'boolean' ? 'PASS' : 'NOT_PROVEN', `Account mode reported: ${account?.livemode ? 'live' : 'test'}`);
    }
  } catch (error) {
    add('stripe', 'account-access', 'FAIL', `Probe failed: ${error.name || 'Error'}`);
  }

  try {
    const endpointResponse = await request('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
      headers: { authorization: `Bearer ${secret}`, accept: 'application/json' },
    });
    const payload = endpointResponse.ok ? await endpointResponse.json().catch(() => null) : null;
    add('stripe', 'webhook-list-access', endpointResponse.ok ? 'PASS' : 'FAIL', `HTTP ${endpointResponse.status}`);
    const appOrigin = (env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || '').trim();
    const expected = appOrigin ? new URL('/next_api/stripe/webhook', appOrigin).toString() : null;
    const endpoints = Array.isArray(payload?.data) ? payload.data : [];
    const match = expected && endpoints.find((item) => item?.url === expected && item?.status === 'enabled');
    add('stripe', 'webhook-endpoint', match ? 'PASS' : strict ? 'FAIL' : 'NOT_PROVEN', match ? 'Enabled production webhook endpoint found' : 'Expected enabled production webhook endpoint not found');
  } catch (error) {
    add('stripe', 'webhook-list-access', 'FAIL', `Probe failed: ${error.name || 'Error'}`);
  }
}

async function probeSentry() {
  const token = configured('SENTRY_AUTH_TOKEN');
  const org = configured('SENTRY_ORG');
  const project = configured('SENTRY_PROJECT');
  if (!token || !org || !project) return;

  try {
    const response = await request(`https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    const payload = response.ok ? await response.json().catch(() => null) : null;
    add('sentry', 'project-access', response.ok ? 'PASS' : 'FAIL', `HTTP ${response.status}`);
    add('sentry', 'project-identity', payload?.slug === project ? 'PASS' : strict ? 'FAIL' : 'NOT_PROVEN', payload?.slug === project ? 'Configured Sentry project resolved' : 'Configured Sentry project was not confirmed');
  } catch (error) {
    add('sentry', 'project-access', 'FAIL', `Probe failed: ${error.name || 'Error'}`);
  }
}

await probeSupabase();
await probeStripe();
await probeSentry();

const failures = results.filter((item) => item.status === 'FAIL');
const report = {
  schema_version: 1,
  evidence_type: 'platform-provider-interoperability',
  repository: env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  commit_sha: env.GITHUB_SHA || null,
  generated_at: new Date().toISOString(),
  strict_runtime: strict,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  results,
  redaction: {
    secret_values_included: false,
    provider_ids_included: false,
    account_emails_included: false,
  },
  limitations: [
    'Checks are read-only and prove API access/configuration at execution time.',
    'Stripe webhook delivery, OAuth login completion, Sentry event ingestion and source-map symbolication require separate transaction evidence.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Provider interoperability: ${report.status}`);
console.log(`Evidence: ${outputPath}`);
if (failures.length > 0) process.exitCode = 1;
