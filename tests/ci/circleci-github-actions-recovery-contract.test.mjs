import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('.circleci/config.yml', 'utf8');
const job = config.split('\n  github-actions-recovery-smoke:\n', 2)[1]
  ?.split('\n  # Opt-in small executor;', 1)[0] ?? '';
const workflow = config.split('\n  github-actions-recovery-manual:\n', 2)[1]
  ?.split('\n  enterprise-source-proof-manual:', 1)[0] ?? '';

test('source-only CircleCI recovery is Free Docker Small and disabled by default', () => {
  assert.match(config, /  run_actions_recovery:\n    type: boolean\n    default: false\n/);
  assert.match(workflow, /when: << pipeline\.parameters\.run_actions_recovery >>/);
  assert.match(workflow, /only:\n\s+- fix\/actions-p0-runner-storm-20261102/);
  assert.match(job, /image: cimg\/node:22/);
  assert.match(job, /resource_class: small/);
  assert.match(job, /CIRCLE_BRANCH:-/);
  assert.match(job, /CIRCLE_SHA1:\?/);
  assert.match(job, /git rev-parse HEAD/);
});

test('recovery runner denies production credentials and executes regression contracts only', () => {
  for (const marker of [
    'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'VERCEL_TOKEN', 'DATABASE_URL',
    'tests/ci/workflow-run-main-branch-contract.test.mjs',
    'tests/ci/github-actions-budget-regression.test.mjs',
    'tests/enterprise/p0-progress-concurrency.test.mjs',
    'tests/security/enterprise-100-stale-workflow-run-guard.test.mjs'
  ]) assert.ok(job.includes(marker), 'Missing invariant: ' + marker);
  assert.doesNotMatch(job, /\bnpm ci\b|\bnpm run build\b|\bstripe checkout\b/);
  assert.doesNotMatch(job, /persist_to_workspace:|store_artifacts:|setup_remote_docker:|machine:/);
});

test('previously implemented CircleCI workflows and their switches are preserved', () => {
  for (const marker of [
    'main-source-validation-manual:', 'qa-preflight-manual:',
    'qa-full-manual:', 'enterprise-source-proof-manual:',
    'enterprise-postgres-synthetic-manual:', 'verificacao-isolada:'
  ]) assert.ok(config.includes(marker), 'Missing existing job: ' + marker);
});
