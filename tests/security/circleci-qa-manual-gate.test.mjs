import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Offline source contract for the manual, credit-conscious CircleCI QA route.
// No real CircleCI credentials, provider tokens, network calls, deployments or payments.
const config = readFileSync(new URL('../../.circleci/config.yml', import.meta.url), 'utf8');
const qaJob = config.split('  qa-preflight-offline:\n')[1]?.split('  # Native PG service is disposable')[0] ?? '';
const qaWorkflow = config.split('  qa-preflight-manual:\n')[1]?.split('  verificacao-isolada:\n')[0] ?? '';

test('CircleCI uses 2.1 configuration', () => {
  assert.match(config, /^version: 2\.1$/m);
});

test('manual QA pipeline parameter is opt-in and disabled by default', () => {
  assert.match(config, /parameters:\n  run_qa_preflight:\n    type: boolean\n    default: false/);
  assert.match(qaWorkflow, /when: << pipeline\.parameters\.run_qa_preflight >>/);
});

test('manual QA workflow is branch-filtered to the exact reviewed QA branch', () => {
  assert.ok(qaWorkflow.includes('only:\n                - qa/fix-e2e-node22-20261021'));
  assert.doesNotMatch(qaWorkflow, /- main\b/);
});

test('small Node 22 executor is used for manual QA', () => {
  assert.match(qaJob, /image: cimg\/node:22\.16\.0/);
  assert.match(qaJob, /resource_class: small/);
});

test('CircleCI job proves exact source SHA rather than accepting an arbitrary checkout', () => {
  assert.match(qaJob, /git rev-parse HEAD/);
  assert.match(qaJob, /CIRCLE_SHA1/);
  assert.match(qaJob, /CIRCLE_BRANCH/);
});

test('offline QA refuses privileged provider credentials', () => {
  assert.match(qaJob, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(qaJob, /STRIPE_SECRET_KEY/);
  assert.match(qaJob, /VERCEL_TOKEN/);
  assert.match(qaJob, /Provider credential forbidden/);
});

test('offline QA runs source-only Node tests without npm install', () => {
  assert.match(qaJob, /node --test --test-reporter=tap/);
  assert.match(qaJob, /tests\/security\/e2e-preflight-offline\.test\.mjs/);
  assert.match(qaJob, /tests\/security\/circleci-qa-manual-gate\.test\.mjs/);
  assert.doesNotMatch(qaJob, /npm (ci|install|run build)/);
  assert.doesNotMatch(qaJob, /vercel (deploy|promote)|stripe (trigger|listen)|supabase (db push|migration up)/);
});

test('source QA suites cannot falsely pass when the first suite fails', () => {
  assert.match(qaJob, /set -euo pipefail/);
  assert.match(qaJob, /2>&1 \| tee artifacts\/qa-preflight\/tests\.tap/);
});

test('CircleCI retains a SHA-bound no-provider QA evidence artifact on success', () => {
  assert.match(qaJob, /sha !== process\.env\.CIRCLE_SHA1/);
  assert.match(qaJob, /testReportSha256:/);
  assert.match(qaJob, /proofBoundary: 'Offline Node source tests only/);
  assert.match(qaJob, /path: artifacts\/qa-preflight/);
  assert.match(qaJob, /destination: qa-preflight-exact-sha/);
});

test('existing full validation and synthetic PostgreSQL workflows are not removed', () => {
  assert.match(config, /  validar-risck:\n/);
  assert.match(config, /  p0-postgres-synthetic:\n/);
  assert.match(config, /  verificacao-isolada:\n/);
  assert.match(config, /Node\.test\.mjs|tests\/security\/p0-membership-release-admission\.test\.mjs/);
});
