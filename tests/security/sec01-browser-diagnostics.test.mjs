import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const verifier = resolve('scripts/enterprise-gates/a01-sec01-verify-app-qa-evidence.mjs');

test('reports a failed browser step without converting partial observations to PASS', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'sec01-diagnostics-'));
  try {
    const git = args => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    git(['init', '-q']);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture']);
    const folder = join(cwd, 'artifacts/enterprise-sec01');
    mkdirSync(folder, { recursive: true });
    const path = join(folder, 'next-app-browser-proof.json');
    const evidence = {
      schema: 'risck-sec01-next-app-qa-browser-proof-v1',
      execution: 'LOCAL_NEXT_APP_BROWSER_QA_AUTH',
      source_sha: git(['rev-parse', 'HEAD']),
      qa_ref: 'zrxrrfbllsxtleyxjpsz',
      outcome: 'FAIL',
      passed_checks: 2,
      checks: [
        { name: 'unauthenticated_api_denied', status: 'PASS' },
        { name: 'unauthenticated_profile_redirected', status: 'PASS' },
      ],
      failure_stage: 'bad_password_denied_in_real_browser',
      failure_detail: 'invalid_password_provider_response_missing',
      qa_cleanup_verified: true,
      emails_sent: 0,
      control: 'NOT_VERIFIED',
      gate: 'NOT_ACCEPTED',
    };
    const fixtureEnv = { ...process.env };
    // The temporary repository has its own HEAD, independent of the CI checkout.
    delete fixtureEnv.CIRCLE_SHA1;
    const verify = () => {
      writeFileSync(path, JSON.stringify(evidence));
      const result = spawnSync(process.execPath, [verifier, '1'], { cwd, encoding: 'utf8', env: fixtureEnv });
      assert.equal(result.status, 1);
      return JSON.parse(result.stdout);
    };
    const summary = verify();
    assert.equal(summary.checks_passed, 0);
    assert.equal(summary.observed_checks_passed, 2);
    assert.equal(summary.failure_stage, evidence.failure_stage);
    assert.equal(summary.failure_detail, evidence.failure_detail);
    evidence.failure_detail = 'untrusted provider message';
    assert.equal(verify().failure_detail, null);
    evidence.source_sha = '0'.repeat(40);
    assert.equal(verify().observed_checks_passed, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
