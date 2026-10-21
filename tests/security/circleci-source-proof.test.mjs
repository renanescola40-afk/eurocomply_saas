import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSourceOnlyProof } from '../../scripts/security/create-circleci-source-proof.mjs';

const SHA = '7'.repeat(40);
const base = () => ({
  CIRCLECI: 'true',
  CIRCLE_JOB: 'validar-risck',
  CIRCLE_SHA1: SHA,
  CIRCLE_BRANCH: 'ci/verify-source-evidence-v17',
  CIRCLE_BUILD_NUM: '253',
});
const run = (env = base(), gitSha = SHA) => makeSourceOnlyProof({
  env, gitSha, timestamp: '2026-10-21T13:40:00.000Z',
});

test('emits bound source-only validation but never enterprise GO', () => {
  const p = run();
  assert.equal(p.sourceCommitSha, SHA);
  assert.equal(p.sourceOnly.result, 'SOURCE_ONLY_CHECKS_COMPLETED');
  assert.equal(p.enterpriseRelease.accepted, false);
  assert.equal(p.enterpriseRelease.decision, 'NO_GO');
  assert.equal(p.enterpriseRelease.productionDeployment, 'NOT_TESTED');
  assert.equal(p.enterpriseRelease.authenticatedTenantIsolation, 'NOT_TESTED');
  assert.equal(p.enterpriseRelease.mandatoryGithubActions, 'NOT_SUBSTITUTED');
});
test('rejects checkout SHA mismatch', () => assert.throws(() => run(base(), '8'.repeat(40)), /checkout_sha_mismatch/));
test('rejects missing CircleCI authorization', () => assert.throws(() => run({...base(), CIRCLECI: ''}), /circleci_runner_required/));
test('rejects unrelated CircleCI job', () => assert.throws(() => run({...base(), CIRCLE_JOB: 'deploy'}), /validar_risck_job_required/));
test('rejects unauthorized branch', () => assert.throws(() => run({...base(), CIRCLE_BRANCH: 'feature/random'}), /disallowed_circleci_branch/));
test('rejects malformed source SHA', () => assert.throws(() => run({...base(), CIRCLE_SHA1: 'abc'}), /exact_sha_required/));
test('rejects privileged variables', () => assert.throws(() => run({...base(), SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-placeholder'}), /privileged_ci_variable_forbidden/));
test('rejects absent job number', () => assert.throws(() => run({...base(), CIRCLE_BUILD_NUM: '0'}), /circleci_build_number_required/));
test('never copies unallowlisted environment data into evidence', () => {
  const report = JSON.stringify(run({...base(), UNRELATED_PRIVATE_VALUE: 'do-not-echo'}));
  assert.equal(report.includes('do-not-echo'), false);
});
