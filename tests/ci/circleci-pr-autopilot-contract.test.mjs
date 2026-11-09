import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = readFileSync('.circleci/config.yml', 'utf8');

test('autopilot is limited to GitHub VCS events, not manual QA triggers', () => {
  assert.match(config, /pr-source-autopilot:\n    when: pipeline\.event\.name == "push" or pipeline\.event\.name == "pull_request"\n    jobs:\n      - pr-source-autopilot/);
});

test('autopilot validates exact source identity and rejects privileged credentials', () => {
  assert.match(config, /test "\$\(git rev-parse HEAD\)" = "\$CIRCLE_SHA1"/);
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'VERCEL_TOKEN', 'DATABASE_URL', 'DIRECT_URL', 'RESEND_API_KEY',
  ]) {
    assert.match(config, new RegExp('for key in [^\\n]*\\b' + key + '\\b'));
  }
  assert.match(config, /formal_acceptance:"NOT_GRANTED"/);
  assert.match(config, /provider_calls:"NOT_EXECUTED"/);
});

test('all provider-backed and expensive gate workflows remain operator-controlled', () => {
  for (const p of [
    'run_sec01_qa_provider', 'run_sec01_qa_browser', 'run_g5_02_pg_replay',
    'run_actions_recovery_quality', 'run_qa_full', 'run_enterprise_pg_synthetic',
  ]) {
    assert.match(config, new RegExp('  ' + p + ':\\n    type: boolean\\n    default: false'));
  }
  assert.match(config, /- hold-a01-sec01-qa-provider:/);
  assert.match(config, /- hold-a01-sec01-browser-qa:/);
});

// Execute the *real* CircleCI preflight against synthetic negative fixtures.
// This is not a fabricated GitHub check or a provider-backed QA test.
import { execFileSync, spawnSync } from 'node:child_process';

function runActualAutopilotPreflight(overrides = {}) {
  const marker = 'name: Verify exact SHA and reject privileged provider credentials\n          command: |\n';
  const index = config.indexOf(marker);
  assert.notEqual(index, -1, 'CircleCI exact-SHA preflight must exist');
  const body = [];
  for (const line of config.slice(index + marker.length).split('\n')) {
    if (!line.startsWith('            ')) break;
    body.push(line.slice(12));
  }
  assert.ok(body.length > 5, 'CircleCI preflight shell script could not be extracted');
  const actualSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const env = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: process.env.HOME ?? '/tmp',
    CIRCLE_SHA1: actualSha,
    ...overrides,
  };
  const execution = spawnSync('bash', ['-c', body.join('\n')], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    timeout: 12000,
  });
  if (execution.error) throw execution.error;
  return execution;
}

test('autopilot negative-contract execution: missing SHA is rejected', () => {
  const result = runActualAutopilotPreflight({ CIRCLE_SHA1: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing CI SHA/);
});

test('autopilot negative-contract execution: checkout mismatch is rejected', () => {
  const result = runActualAutopilotPreflight({ CIRCLE_SHA1: '0'.repeat(40) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing checkout inconsistent with pipeline SHA/);
});

test('autopilot negative-contract execution: synthetic provider credentials are rejected', () => {
  for (const key of ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'VERCEL_TOKEN']) {
    const result = runActualAutopilotPreflight({ [key]: 'synthetic-fixture-not-a-credential' });
    assert.notEqual(result.status, 0, key + ' must fail closed');
    assert.match(result.stderr, new RegExp('Privileged variable forbidden in untrusted PR CI: ' + key));
  }
});

test('autopilot permits exact SHA only when the environment contains no protected credentials', () => {
  const result = runActualAutopilotPreflight();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SOURCE_ONLY; exact SHA verified/);
});
