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

test('second-stage full quality CI stays opt-in and pinned to recovery SHA with non-production resources', () => {
  assert.match(config, /  run_actions_recovery_quality:\n    type: boolean\n    default: false\n/);
  const quality = config.split('\n  github-actions-recovery-quality:\n', 2)[1]
    ?.split('\n  # Opt-in small executor;', 1)[0] ?? '';
  const recovery = config.split('\n  github-actions-recovery-quality-manual:\n', 2)[1]
    ?.split('\n  enterprise-source-proof-manual:', 1)[0] ?? '';
  assert.match(recovery, /when: << pipeline\.parameters\.run_actions_recovery_quality >>/);
  assert.match(recovery, /only:\n\s+- fix\/actions-p0-runner-storm-20261102/);
  assert.match(quality, /image: cimg\/node:22/);
  assert.match(quality, /resource_class: medium/);
  assert.match(quality, /CIRCLE_BRANCH:-/);
  assert.match(quality, /CIRCLE_SHA1:\?/);
  assert.match(quality, /git rev-parse HEAD/);
  for (const marker of [
    'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'DATABASE_URL', 'VERCEL_TOKEN',
    'npm ci --ignore-scripts --no-audit --no-fund',
    'npm run security:package-lock', 'node scripts/security/run-security-ci-without-audit.mjs',
    'npm run lint', 'npm run typecheck', 'npm run test', 'npm run build',
    'NEXT_PUBLIC_SUPABASE_URL: https://ci-placeholder.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY: public-placeholder-anon-key'
  ]) assert.ok(quality.includes(marker), 'Missing quality guard: ' + marker);
  assert.doesNotMatch(quality, /setup_remote_docker:|persist_to_workspace:|\bnpm run deploy\b/);
  assert.match(config, /github-actions-recovery-manual:/, 'first-stage smoke remains unchanged');
});
