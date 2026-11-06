import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { makeQualityProof } from '../../scripts/ci/create-circleci-quality-proof.mjs';

const sha = 'a'.repeat(40);
const env = {
  CIRCLECI: 'true', CIRCLE_JOB: 'github-actions-recovery-quality',
  CIRCLE_BRANCH: 'integration/enterprise-unified-candidate-20261102',
  CIRCLE_SHA1: sha, CIRCLE_BUILD_NUM: '429',
  CIRCLE_WORKFLOW_ID: '11111111-1111-4111-8111-111111111111',
};
const proof = (overrides = {}, gitSha = sha) => makeQualityProof({
  env: { ...env, ...overrides }, gitSha, timestamp: '2026-11-03T16:00:00Z',
});

test('quality proof identifies exact job and source without granting acceptance', () => {
  const result = proof();
  assert.equal(result.sourceCommitSha, sha);
  assert.equal(result.circleci.buildNumber, 429);
  assert.equal(result.circleci.workflowId, env.CIRCLE_WORKFLOW_ID);
  assert.equal(result.formalAcceptance, 'NOT_GRANTED');
  assert.equal(result.authenticatedRuntime, 'NOT_TESTED');
  assert.equal(result.productionDeployment, 'NOT_TESTED');
  assert.ok(result.completedCommands.includes('npm run quality:routes'));
  assert.ok(!result.completedCommands.includes('npm run security:npm-audit:all'));
});

test('quality evidence rejects wrong runner, source, branch and missing provider identity', () => {
  for (const overrides of [
    { CIRCLECI: 'false' }, { CIRCLE_JOB: 'synthetic-backup-components' },
    { CIRCLE_BRANCH: 'main' }, { CIRCLE_SHA1: 'b'.repeat(40) },
    { CIRCLE_BUILD_NUM: '0' }, { CIRCLE_WORKFLOW_ID: '' },
  ]) assert.throws(() => proof(overrides));
  assert.throws(() => proof({}, 'short'));
});

test('quality evidence refuses production-capable credentials', () => {
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VERCEL_TOKEN', 'DATABASE_URL',
    'DIRECT_URL', 'RESEND_API_KEY', 'SENTRY_AUTH_TOKEN', 'QA_DB_PASSWORD', 'PGPASSWORD']) {
    assert.throws(() => proof({ [key]: 'forbidden-test-fixture' }));
  }
});

test('manual onboarding source review produces a bounded exact-SHA quality proof', () => {
  const result = proof({ CIRCLE_BRANCH: 'fix/onboarding-explicit-plan-boundary-test-20261105' });
  assert.equal(result.circleci.branch, 'fix/onboarding-explicit-plan-boundary-test-20261105');
  assert.equal(result.sourceCommitSha, sha);
  assert.equal(result.formalAcceptance, 'NOT_GRANTED');
});

test('quality job validates routes before emitting and archiving bounded evidence', () => {
  const config = readFileSync('.circleci/config.yml', 'utf8');
  const job = config.split('\n  github-actions-recovery-quality:\n')[1].split('\n  qa-preflight-offline:\n')[0];
  const route = job.indexOf('npm run quality:routes');
  const emit = job.indexOf('node scripts/ci/create-circleci-quality-proof.mjs');
  assert.ok(route > job.indexOf('npm run build'));
  assert.ok(emit > route);
  assert.ok(job.indexOf('store_artifacts:') > emit);
  assert.match(job, /set -euo pipefail/);
  assert.match(job, /quality-routes\.log/);
  assert.doesNotMatch(job, /create-circleci-source-proof|when: always|continue-on-error/);
});
