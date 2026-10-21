import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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
test('allows only the specifically named source-proof branch', () => {
  const exact = 'fix/circleci-source-evidence-v17-20261021';
  assert.equal(run({...base(), CIRCLE_BRANCH: exact}).circleci.branch, exact);
  assert.throws(() => run({...base(), CIRCLE_BRANCH: exact + '-untrusted'}), /disallowed_circleci_branch/);
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

test('actual CircleCI admission command accepts the source-proof branch and rejects untrusted branches or SHA', () => {
  const config = readFileSync('.circleci/config.yml', 'utf8');
  const match = config.match(/name: Confirmar branch permitida, SHA exato e Node 22\s+command: \|\n([\s\S]*?)(?=\n      - run:)/);
  assert.ok(match, 'Read the actual first job command, not a mirrored predicate');
  const command = match[1].split('\n').map(line => line.replace(/^ {12}/, '')).join('\n');
  const cwd = mkdtempSync(join(tmpdir(), 'risck-ci-admission-'));
  try {
    execFileSync('git', ['init', '--quiet', cwd]);
    execFileSync('git', ['-c', 'user.name=Synthetic CI', '-c', 'user.email=ci@example.test',
      '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--allow-empty', '-m', 'synthetic admission fixture'], { cwd });
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
    const runAdmission = (branch, sourceSha = sha) => spawnSync('bash', ['-c', command], {
      cwd, encoding: 'utf8', env: { PATH: process.env.PATH, CIRCLE_BRANCH: branch, CIRCLE_SHA1: sourceSha },
    });
    for (const branch of ['main', 'ci/verify-source-evidence-v17', 'fix/circleci-source-evidence-v17-20261021']) {
      const run = runAdmission(branch);
      assert.equal(run.status, 0, `${branch}: ${run.stderr}`);
    }
    for (const branch of ['feature/random', 'fix/circleci-source-evidence-v17-20261021-untrusted']) {
      const run = runAdmission(branch);
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /unexpected branch/);
    }
    const wrongSha = runAdmission('fix/circleci-source-evidence-v17-20261021', '0'.repeat(40));
    assert.notEqual(wrongSha.status, 0);
    assert.match(wrongSha.stderr, /checkout SHA does not match pipeline SHA/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
