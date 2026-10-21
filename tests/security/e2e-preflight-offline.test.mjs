import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Dependency-free source proof for the manual isolated-E2E QA workflow.
// Run from the repository root: node --test tests/security/e2e-preflight-offline.test.mjs
// This deliberately makes no network requests or use of real provider secrets.
const workflow = readFileSync(new URL('../../.github/workflows/e2e.yml', import.meta.url), 'utf8');
const startTag = "          node --input-type=module <<'NODE'\n";
const endTag = '\n          NODE\n';
const start = workflow.indexOf(startTag);
const end = workflow.indexOf(endTag, start + startTag.length);
assert.ok(start !== -1 && end > start, 'exact QA workflow preflight is present');
const script = workflow.slice(start + startTag.length, end).split('\n')
  .map((line) => {
    if (line === '') return '';
    assert.ok(line.startsWith('          '), 'preflight nonempty line must retain YAML indentation');
    return line.slice(10);
  }).join('\n');

const fixtures = Object.freeze({
  E2E_BASE_URL: 'https://isolated-qa.example.invalid',
  NEXT_PUBLIC_SUPABASE_URL: 'https://disposableisolatedqa.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-role',
  STRIPE_SECRET_KEY: 'sk_test_synthetic',
  STRIPE_WEBHOOK_SECRET: 'whsec_synthetic',
  E2E_OWNER_EMAIL: 'synthetic-owner@example.invalid',
  E2E_OWNER_PASSWORD: 'synthetic-password',
  E2E_QA_MAIL_SINK_CONFIRMED: 'true',
});

function preflight(overrides = {}) {
  const env = { ...fixtures };
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) delete env[name];
    else env[name] = value;
  }
  return spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    env, encoding: 'utf8', timeout: 5000,
  });
}

test('isolated synthetic QA preflight succeeds without a network dependency', () => {
  const result = preflight();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Isolated E2E QA preflight passed/);
});

const denialCases = [
  ['production root host', { E2E_BASE_URL: 'https://risckcomply.com' }, 'qa_runtime_cannot_target_public_production'],
  ['production www host', { E2E_BASE_URL: 'https://www.risckcomply.com' }, 'qa_runtime_cannot_target_public_production'],
  ['production trailing DNS dot', { E2E_BASE_URL: 'https://www.risckcomply.com.' }, 'qa_runtime_cannot_target_public_production'],
  ['production root trailing DNS dot', { E2E_BASE_URL: 'https://risckcomply.com.' }, 'qa_runtime_cannot_target_public_production'],
  ['production subdomain', { E2E_BASE_URL: 'https://qa.risckcomply.com' }, 'qa_runtime_cannot_target_public_production'],
  ['non-TLS QA URL', { E2E_BASE_URL: 'http://isolated-qa.example.invalid' }, 'qa_runtime_cannot_target_public_production'],
  ['credential-bearing QA URL', { E2E_BASE_URL: 'https://user@isolated-qa.example.invalid' }, 'qa_runtime_cannot_target_public_production'],
  ['production Supabase project', { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' }, 'qa_runtime_requires_nonproduction_supabase'],
  ['untrusted Supabase host', { NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.invalid' }, 'qa_runtime_requires_nonproduction_supabase'],
  ['Supabase URL with user info', { NEXT_PUBLIC_SUPABASE_URL: 'https://user@disposableisolatedqa.supabase.co' }, 'qa_runtime_requires_nonproduction_supabase'],
  ['Supabase URL with path', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableisolatedqa.supabase.co/auth/v1' }, 'qa_runtime_requires_nonproduction_supabase'],
  ['Supabase URL with query', { NEXT_PUBLIC_SUPABASE_URL: 'https://disposableisolatedqa.supabase.co/?redirect=https://example.invalid' }, 'qa_runtime_requires_nonproduction_supabase'],
  ['live Stripe secret', { STRIPE_SECRET_KEY: 'sk_live_synthetic' }, 'qa_runtime_requires_stripe_test_keys'],
  ['owner password missing', { E2E_OWNER_PASSWORD: null }, 'qa_runtime_missing_configuration'],
  ['mail-sink not attested', { E2E_QA_MAIL_SINK_CONFIRMED: 'false' }, 'qa_runtime_mail_sink_not_confirmed'],
];
for (const [label, overrides, reason] of denialCases) {
  test('rejects ' + label, () => {
    const result = preflight(overrides);
    assert.notEqual(result.status, 0, 'unsafe QA configuration unexpectedly passed');
    assert.match(result.stderr, new RegExp(reason));
  });
}

test('workflow uses dedicated QA secrets and never runs E2E on push', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /secrets\.E2E_QA_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /secrets\.E2E_QA_STRIPE_SECRET_KEY/);
  assert.doesNotMatch(workflow, /secrets\.STRIPE_SECRET_KEY/);
  assert.match(workflow, /node-version:\s*22\b/);
});
