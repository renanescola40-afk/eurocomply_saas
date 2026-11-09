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
