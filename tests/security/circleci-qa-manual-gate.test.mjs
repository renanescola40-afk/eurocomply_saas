import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';

// Offline source contract for the manual, credit-conscious CircleCI QA route.
// No real CircleCI credentials, provider tokens, network calls, deployments or payments.
const config = readFileSync(new URL('../../.circleci/config.yml', import.meta.url), 'utf8');
const qaJob = config.split('  qa-preflight-offline:\n')[1]?.split('  # Native PG service is disposable')[0] ?? '';
const qaWorkflow = config.split('  qa-preflight-manual:\n')[1]?.split('  verificacao-isolada:\n')[0] ?? '';
const fullQaWorkflow = config.split('  qa-full-manual:\n')[1]?.split('  verificacao-isolada:\n')[0] ?? '';
const canonicalWorkflow = config.split('  verificacao-isolada:\n')[1] ?? '';


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
  assert.match(qaJob, /tests\/security\/payment-first-qa-origin-guard\.test\.mjs/);
  assert.match(qaJob, /tests\/security\/playwright-synthetic-write-qa-gate\.test\.mjs/);
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
  assert.match(qaJob, /proofBoundary: 'Offline Node and Stripe source-contract checks only; no Playwright, provider delivery, Supabase, payment or deployment proof'/);
  assert.match(qaJob, /path: artifacts\/qa-preflight/);
  assert.match(qaJob, /destination: qa-preflight-exact-sha/);
});

test('Stripe webhook and entitlement source contract checks run without provider access', () => {
  assert.match(qaJob, /node scripts\/security\/check-stripe-webhook-contract\.mjs/);
  assert.match(qaJob, /node scripts\/security\/run-stripe-runtime-validation\.mjs/);
  assert.match(qaJob, /stripe-webhook-contract\.txt/);
  assert.match(qaJob, /stripe-runtime-source-only\.json/);
  assert.match(qaJob, /stripeWebhookContractSha256/);
  assert.match(qaJob, /stripeRuntimeSourceOnlySha256/);
});

test('Stripe source validation must not falsely claim paid E2E or promote enterprise proof', () => {
  const validator = readFileSync(new URL('../../scripts/security/run-stripe-runtime-validation.mjs', import.meta.url), 'utf8');
  assert.match(validator, /runtimeProofExecuted: false/);
  assert.match(validator, /validationStatus: evidence\.validationStatus/);
  assert.match(validator, /repository_contract_passed_runtime_not_run/);
  assert.doesNotMatch(qaJob, /--update-register|--write-open-evidence/);
});

test('full QA is disabled by default and only manually runs on exact QA branch', () => {
  assert.match(config, /  run_qa_full:\n    type: boolean\n    default: false/);
  assert.match(fullQaWorkflow, /when: << pipeline\.parameters\.run_qa_full >>/);
  assert.match(fullQaWorkflow, /- validar-risck:/);
  assert.match(fullQaWorkflow, /- p0-postgres-synthetic:/);
  assert.equal((fullQaWorkflow.match(/- qa\/fix-e2e-node22-20261021/g) ?? []).length, 2);
  assert.doesNotMatch(fullQaWorkflow, /- main\b/);
});

test('normal automatic workflow never launches full QA jobs on the QA branch', () => {
  assert.match(canonicalWorkflow, /- main\n/);
  assert.doesNotMatch(canonicalWorkflow, /- qa\/fix-e2e-node22-20261021/);
});

test('full QA keeps existing source-only secret denial and exact source SHA', () => {
  const fullJob = config.split('  validar-risck:\n')[1]?.split('  # Opt-in small executor')[0] ?? '';
  const pgJob = config.split('  p0-postgres-synthetic:\n')[1]?.split('workflows:\n')[0] ?? '';
  assert.match(fullJob, /CIRCLE_SHA1/);
  assert.match(fullJob, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(pgJob, /CIRCLE_SHA1/);
  assert.match(pgJob, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(pgJob, /postgres:17\.6/);
});

test('existing full validation and synthetic PostgreSQL workflows are not removed', () => {
  assert.match(config, /  validar-risck:\n/);
  assert.match(config, /  p0-postgres-synthetic:\n/);
  assert.match(config, /  verificacao-isolada:\n/);
  assert.match(config, /Node\.test\.mjs|tests\/security\/p0-membership-release-admission\.test\.mjs/);
});

test('QA evidence heredoc survives CircleCI interpolation and remains valid Bash', () => {
  assert.doesNotMatch(qaJob, /(?<!\\)<<['"]?NODE/);
  const match = qaJob.match(/name: Execute source-only QA suites and preserve exact-SHA evidence\s+command: \|\n([\s\S]*?)(?=\n      - store_artifacts:)/);
  assert.ok(match, 'Validate the actual command retained in the job');
  const command = match[1].split('\n').map(line => line.replace(/^ {12}/, '')).join('\n')
    .replace(/\\<</g, '<<');
  assert.match(command, /node --input-type=module <<'NODE'/);
  const syntax = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});
