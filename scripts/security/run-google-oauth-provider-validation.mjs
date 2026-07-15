import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUTPUT = 'docs/security/evidence/runtime/google-oauth-validation.json';
const required = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'ENTERPRISE_EXPECTED_SHA',
  'GITHUB_RUN_ID',
  'GITHUB_REPOSITORY',
  'GITHUB_REF_NAME',
];
const failures = [];
for (const name of required) {
  if (!String(process.env[name] ?? '').trim()) failures.push(`missing_${name.toLowerCase()}`);
}

const sha = String(process.env.ENTERPRISE_EXPECTED_SHA ?? '').trim().toLowerCase();
const githubRunId = String(process.env.GITHUB_RUN_ID ?? '').trim();
if (!/^[0-9a-f]{40}$/.test(sha)) failures.push('invalid_release_sha');
if (!/^\d+$/.test(githubRunId)) failures.push('invalid_github_run_id');
if (process.env.GITHUB_ACTIONS !== 'true') failures.push('untrusted_execution');
if (process.env.GITHUB_REPOSITORY !== 'renanescola40-afk/eurocomply_saas') failures.push('unexpected_repository');
if (process.env.GITHUB_REF_NAME !== 'main') failures.push('unexpected_branch');

function parseHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isExactProductionCallback(value, siteUrl) {
  const callback = parseHttpsUrl(value);
  if (!callback || !siteUrl) return false;
  return callback.origin === siteUrl.origin
    && callback.pathname === '/auth/callback'
    && callback.search === ''
    && callback.hash === '';
}

let providerEnabled = false;
let siteUrlConfigured = false;
let redirectAllowlistConfigured = false;
let providerConfigRead = false;
let providerHost = null;

if (failures.length === 0) {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(process.env.SUPABASE_PROJECT_REF)}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error(`management_api_${response.status}`);

    const config = await response.json();
    providerConfigRead = true;
    providerEnabled = config.external_google_enabled === true;

    const siteUrl = parseHttpsUrl(config.site_url);
    siteUrlConfigured = Boolean(siteUrl);
    providerHost = siteUrl?.hostname ?? null;

    const allowlist = Array.isArray(config.uri_allow_list)
      ? config.uri_allow_list
      : String(config.uri_allow_list ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    redirectAllowlistConfigured = allowlist.some((value) => isExactProductionCallback(value, siteUrl));

    if (!providerEnabled) failures.push('google_provider_disabled');
    if (!siteUrlConfigured) failures.push('site_url_not_https');
    if (!redirectAllowlistConfigured) failures.push('exact_same_origin_callback_missing');
  } catch (error) {
    failures.push(
      error instanceof Error
        ? error.message.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
        : 'provider_validation_failed',
    );
  }
}

const passed = failures.length === 0;
const now = new Date().toISOString();
const evidence = {
  schemaVersion: '2.0',
  evidenceItem: 'google-oauth-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  reviewer: 'RISCK COMPLY protected runtime automation',
  reviewedAt: now,
  generatedAt: now,
  summary: passed
    ? 'Protected Supabase Management API validation confirmed that Google OAuth is enabled and the exact same-origin production auth callback is allowlisted for the release SHA.'
    : 'Google OAuth provider configuration was not proven for the exact release SHA; enterprise release remains blocked.',
  repository: process.env.GITHUB_REPOSITORY ?? null,
  branch: process.env.GITHUB_REF_NAME ?? null,
  targetSha: sha || null,
  githubRunId: githubRunId || null,
  provider: 'supabase-auth-google',
  providerHost,
  checks: {
    providerConfigRead,
    googleProviderEnabled: providerEnabled,
    httpsSiteUrlConfigured: siteUrlConfigured,
    exactSameOriginCallbackAllowlisted: redirectAllowlistConfigured,
  },
  failures,
  controlsVerified: passed
    ? [
      'google_oauth_provider_enabled',
      'oauth_site_url_configured',
      'oauth_exact_same_origin_callback_allowlisted',
    ]
    : [],
  evidenceLocations: [
    'scripts/security/run-google-oauth-provider-validation.mjs',
    '.github/workflows/google-oauth-provider-proof.yml',
    'docs/security/evidence/runtime/google-oauth-validation.json',
  ],
  redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
  productionGate: passed
    ? 'eligible for final release evaluation'
    : 'blocked until protected Google OAuth provider validation passes',
  completionRule: 'Run the protected Google OAuth Provider Proof workflow for the exact deployed main SHA. Interactive end-to-end login remains a separate release acceptance check.',
  evidenceIntegrity: {
    placeholderOnly: !passed,
    managementTokenStored: false,
    projectReferenceStored: false,
    rawProviderConfigStored: false,
    rawRedirectAllowlistStored: false,
    siteUrlStored: false,
    customerDataStored: false,
  },
  limitations: ['This proves provider configuration, not a complete interactive Google user login transaction.'],
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
if (!passed) {
  console.error(`Google OAuth provider validation failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Google OAuth provider configuration validated.');
