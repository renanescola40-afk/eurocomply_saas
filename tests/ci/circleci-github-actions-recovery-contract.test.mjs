import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('.circleci/config.yml', 'utf8');
// Bound every inspection to exactly one CircleCI job, rather than relying on
// comments that may move when another job is added to the configuration.
function circleJob(name) {
  const marker = '\n  ' + name + ':\n';
  const start = config.indexOf(marker);
  assert.notEqual(start, -1, 'Missing CircleCI job: ' + name);
  const tail = config.slice(start + marker.length);
  const next = tail.search(/\n  [a-zA-Z][a-zA-Z0-9_-]*:\n/);
  return next === -1 ? tail : tail.slice(0, next);
}

const job = circleJob('github-actions-recovery-smoke');
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
  const quality = circleJob('github-actions-recovery-quality');
  const recovery = config.split('\n  github-actions-recovery-quality-manual:\n', 2)[1]
    ?.split('\n  enterprise-source-proof-manual:', 1)[0] ?? '';
  assert.match(recovery, /when: << pipeline\.parameters\.run_actions_recovery_quality >>/);
  assert.match(recovery, /only:\n\s+- fix\/actions-p0-runner-storm-20261102/);
  assert.match(quality, /image: cimg\/node:22/);
  assert.match(quality, /resource_class: large/);
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

test('source-only smoke guard inspects only its job and cannot accidentally absorb the full quality job', () => {
  const smoke = circleJob('github-actions-recovery-smoke');
  const quality = circleJob('github-actions-recovery-quality');
  assert.doesNotMatch(smoke, /github-actions-recovery-quality:|npm ci|npm run build/);
  assert.match(quality, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(quality, /npm run build/);
  assert.match(smoke, /resource_class: small/);
  assert.match(quality, /resource_class: large/);
});


test('manual smoke and quality guards agree with branch filters; candidate opt-in only', () => {
  const candidate = 'integration/enterprise-unified-candidate-20261102';
  const recoveryBranch = 'fix/actions-p0-runner-storm-20261102';
  const oneShotBranch = 'ci/circleci-gh-actions-one-shot-20261102';
  const smoke = circleJob('github-actions-recovery-smoke');
  const quality = circleJob('github-actions-recovery-quality');
  const manualSmoke = config.split('\n  github-actions-recovery-manual:\n', 2)[1]
    ?.split('\n  github-actions-recovery-quality-manual:\n', 1)[0] ?? '';
  const manualQuality = config.split('\n  github-actions-recovery-quality-manual:\n', 2)[1]
    ?.split('\n  github-actions-quality-one-shot-20261102:\n', 1)[0] ?? '';
  const oneShot = config.split('\n  github-actions-quality-one-shot-20261102:\n', 2)[1]
    ?.split('\n  enterprise-source-proof-manual:\n', 1)[0] ?? '';
  for (const approved of [candidate, recoveryBranch]) {
    assert.ok(smoke.includes(approved), 'smoke guard rejects: ' + approved);
    assert.ok(quality.includes(approved), 'quality guard rejects: ' + approved);
    assert.ok(manualSmoke.includes('- ' + approved), 'smoke workflow filter rejects: ' + approved);
    assert.ok(manualQuality.includes('- ' + approved), 'quality workflow filter rejects: ' + approved);
  }
  assert.ok(quality.includes(oneShotBranch), 'existing quality one-shot guard removed');
  assert.ok(oneShot.includes('- ' + oneShotBranch), 'one-shot branch filter removed');
  assert.ok(!oneShot.includes(candidate), 'candidate must never auto-run in CircleCI');
  assert.match(manualSmoke, /when: << pipeline\.parameters\.run_actions_recovery >>/);
  assert.match(manualQuality, /when: << pipeline\.parameters\.run_actions_recovery_quality >>/);
});


test('unified candidate smoke runs source-only security billing and evidence contracts without npm or provider writes',()=>{
 const smoke = circleJob('github-actions-recovery-smoke');
 for (const marker of [
  'integration/enterprise-unified-candidate-20261102',
  'tests/security/client-env-access.test.mjs',
  'tests/ci/circleci-readonly-diagnose.test.mjs',
  'tests/ci/enterprise-evidence-exact-sha-contract.test.mjs',
  'tests/billing/checkout-price-authority.test.mjs',
  'node --experimental-strip-types --test'
 ]) assert.ok(smoke.includes(marker),'candidate source-only test missing: '+marker);
 assert.doesNotMatch(smoke,/npm ci|npm run build|stripe checkout|store_artifacts:/);
 const automatic=config.split('\n  github-actions-quality-one-shot-20261102:\n',2)[1]
  ?.split('\n  enterprise-source-proof-manual:\n',1)[0] ?? '';
 assert.doesNotMatch(automatic,/integration\/enterprise-unified-candidate-20261102/);
 assert.match(config,/run_actions_recovery:\n    type: boolean\n    default: false/);
});

