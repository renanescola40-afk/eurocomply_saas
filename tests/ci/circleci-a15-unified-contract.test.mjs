import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('.circleci/config.yml', 'utf8');
const branch = 'ci/a15-unified-evidence-20261107';
const workflow = config.split('\n  a15-unified-evidence-once-20261107:\n', 2)[1]?.split('\n  github-actions-recovery-manual:', 1)[0] ?? '';
const jobs = config.split('\njobs:\n', 2)[1]?.split('\nworkflows:', 1)[0] ?? '';

test('unified source verification is ONE branch, exact SHA and no main or production branch', () => {
  assert.ok(workflow, 'one-shot workflow missing');
  assert.match(workflow, /- a15-unified-contracts:/);
  assert.match(workflow, /- a15-actionlint-exact-sha:/);
  assert.match(workflow, /- a15-gitleaks-tool-preflight:/);
  assert.match(workflow, /- a15-gitleaks-report-collection:/);
  assert.match(workflow, /- a15-gitleaks-findings-gate:/);
  const allowed = [...workflow.matchAll(/^\s+- ci\/a15-unified-evidence-20261107\s*$/gm)];
  assert.equal(allowed.length, 5, 'all five jobs must be branch-filtered');
  assert.doesNotMatch(workflow, /- main\b|production|deploy|stripe checkout/i);
  assert.match(jobs, /test "\$\(git rev-parse HEAD\)" = "\$CIRCLE_SHA1"/);
});

test('gitleaks collection and preflight admit only reviewed scoped names including one-shot', () => {
  const guard = 'fix/onboarding-explicit-plan-boundary-test-20261105|ci/a15-gitleaks-one-shot-20261106|' + branch + ') ;;';
  assert.equal(config.split(guard).length - 1, 2, 'two enforced branch allowlists required');
  assert.match(jobs, /Gitleaks collection branch not authorized/);
  assert.match(jobs, /A-15 preflight refused branch/);
});

test('gitleaks actual zero-finding gate is required and cannot be skipped', () => {
  assert.match(workflow, /- a15-gitleaks-report-collection:\n\s+requires:\n\s+- a15-gitleaks-tool-preflight/);
  assert.match(workflow, /- a15-gitleaks-findings-gate:\n\s+requires:\n\s+- a15-gitleaks-report-collection/);
  assert.match(jobs, /A15_GITLEAKS_FINDINGS_PRESENT_SECURITY_GATE_BLOCKED/);
  assert.match(jobs, /A15_GITLEAKS_IDENTITY_MISMATCH/);
  assert.match(jobs, /A15_GITLEAKS_INVALID_REPORT/);
  assert.match(jobs, /--redact --no-banner/);
});

test('all A-15 source jobs reject provider credentials and cannot run automatically on main', () => {
  const names = ['a15-unified-contracts', 'a15-actionlint-exact-sha',
    'a15-gitleaks-tool-preflight', 'a15-gitleaks-report-collection', 'a15-gitleaks-findings-gate'];
  for (const name of names) {
    const block = config.split('\n  ' + name + ':\n', 2)[1]?.split(/\n  [a-z0-9-]+:\n|\nworkflows:/, 1)[0] ?? '';
    assert.ok(block.includes('CIRCLE_SHA1'), name + ' must verify exact SHA');
    assert.ok(block.includes('STRIPE_SECRET_KEY'), name + ' must refuse Stripe secrets');
    assert.ok(block.includes('VERCEL_TOKEN'), name + ' must refuse Vercel secrets');
  }
});
