import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const config = fs.readFileSync(new URL('../../.circleci/config.yml', import.meta.url), 'utf8');
const start = config.indexOf('\n  pr-head-validation:\n');
const end = config.indexOf('\n  synthetic-backup-components:\n', start);
assert.ok(start !== -1 && end > start, 'expected standalone CircleCI PR-head validation job');
const job = config.slice(start, end);
const match = job.match(/case "\$TARGET_PR_BRANCH" in\s*\n\s*([^\n]+?)\)\s*;;/);
assert.ok(match, 'expected a single explicit shell-case branch allowlist');
const branches = match[1].split('|');

test('A-18 PR #2620 branch is explicitly allowed without opening wildcards', () => {
  assert.ok(branches.includes('acceptance/a18-ops01-formal-v27-20261105'));
  assert.equal(new Set(branches).size, branches.length, 'duplicate branch policy');
  for (const branch of branches) {
    assert.match(branch, /^[a-z0-9][a-z0-9._/-]*$/, 'must use literal Git branch names, never glob patterns');
  }
  for (const forbidden of ['main', 'production', 'refs/heads/main', 'acceptance/*', '*']) {
    assert.equal(branches.includes(forbidden), false, 'broad or live branch unexpectedly allowed');
  }
});

test('manual exact-head validation remains disabled by default', () => {
  assert.match(config, /  run_pr_head_validation:\n    type: boolean\n    default: false/);
  assert.match(config, /  pr-head-validation-manual:\n    when: << pipeline\.parameters\.run_pr_head_validation >>/);
  assert.match(config, /  pr-head-validation-manual:[\s\S]*?jobs:\n      - pr-head-validation:[\s\S]*?only:\n                - ci\/circleci-pr-validation-20261104/);
  assert.match(job, /test "\$\{CIRCLE_BRANCH:-\}" = "ci\/circleci-pr-validation-20261104"/);
});

test('target SHA is validated against exact current GitHub branch head and detached checkout', () => {
  for (const necessary of [
    '[[ "$TARGET_PR_SHA" =~ ^[0-9a-f]{40}$ ]]',
    'git ls-remote --exit-code origin "refs/heads/$TARGET_PR_BRANCH"',
    'test "$remote_sha" = "$TARGET_PR_SHA"',
    'git fetch --depth=1 origin "refs/heads/$TARGET_PR_BRANCH"',
    'git checkout --detach "$TARGET_PR_SHA"',
    'test "$(git rev-parse HEAD)" = "$TARGET_PR_SHA"',
  ]) {
    assert.ok(job.includes(necessary), 'missing exact-SHA admission condition: ' + necessary);
  }
  assert.ok(job.indexOf('test "$remote_sha" = "$TARGET_PR_SHA"') < job.indexOf('git fetch --depth=1 origin'));
  assert.ok(job.indexOf('git checkout --detach "$TARGET_PR_SHA"') < job.indexOf('test "$(git rev-parse HEAD)" = "$TARGET_PR_SHA"'));
});

test('PR-head source-only job refuses privileged provider credentials', () => {
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN', 'DATABASE_URL', 'DIRECT_URL',
  ]) {
    assert.ok(job.includes(key), 'missing forbidden credential: ' + key);
  }
  assert.ok(job.includes('Provider credential is forbidden in source-only PR validation'));
});

test('policy regression runs on config source before target checkout', () => {
  const testStep = job.indexOf('node --test tests/ci/circleci-pr-head-policy.test.mjs');
  const targetCheckout = job.indexOf('git checkout --detach "$TARGET_PR_SHA"');
  assert.ok(testStep >= 0 && targetCheckout > testStep, 'run policy test before swapping to PR source');
});

test('coordinator policy edits do not automatically launch heavy source validation', () => {
  const workflowStart = config.lastIndexOf('\n  pr-source-validation:\n');
  assert.ok(workflowStart >= 0);
  const workflow = config.slice(workflowStart);
  assert.ok(workflow.includes('      - pr-source-validation:'));
  assert.doesNotMatch(workflow, /^\s+- ci\/circleci-pr-validation-20261104\s*$/m);
  assert.match(workflow, /^\s+- normal2\/product-enterprise-v18-checkout-price-authority-20261102\s*$/m,
    'do not remove existing product-source validation coverage');
});
