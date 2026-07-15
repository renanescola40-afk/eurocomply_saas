import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUTPUT = 'docs/security/evidence/runtime/google-oauth-validation.json';
const PROBE = 'scripts/security/probe-google-oauth-provider.mjs';
const required = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'RELEASE_PRODUCTION_URL',
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

let providerProbePassed = false;
if (failures.length === 0) {
  const probe = spawnSync(process.execPath, [PROBE], {
    env: process.env,
    stdio: 'ignore',
    timeout: 20000,
    killSignal: 'SIGTERM',
  });

  providerProbePassed = !probe.error && probe.status === 0 && probe.signal === null;
  if (!providerProbePassed) failures.push('provider_configuration_not_verified');
}

const passed = failures.length === 0 && providerProbePassed;
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
    ? 'A protected isolated probe confirmed that Google OAuth is enabled and the exact production origin auth callback is allowlisted for the release SHA.'
    : 'Google OAuth provider configuration was not proven for the exact release SHA; enterprise release remains blocked.',
  repository: process.env.GITHUB_REPOSITORY ?? null,
  branch: process.env.GITHUB_REF_NAME ?? null,
  targetSha: sha || null,
  githubRunId: githubRunId || null,
  provider: 'supabase-auth-google',
  checks: {
    providerConfigRead: passed,
    googleProviderEnabled: passed,
    httpsSiteUrlConfigured: passed,
    productionOriginMatched: passed,
    exactProductionCallbackAllowlisted: passed,
  },
  failures,
  controlsVerified: passed
    ? [
      'google_oauth_provider_enabled',
      'oauth_site_url_configured',
      'oauth_production_origin_matched',
      'oauth_exact_production_callback_allowlisted',
    ]
    : [],
  evidenceLocations: [
    'scripts/security/probe-google-oauth-provider.mjs',
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
    expectedProductionUrlStored: false,
    providerHostnameStored: false,
    remoteErrorStored: false,
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
