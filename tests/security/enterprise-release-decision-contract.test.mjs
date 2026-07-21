import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/security/build-enterprise-release-decision.mjs');
const sha = 'a'.repeat(40);

function fixture({ evidenceOverrides = {}, acceptance } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'enterprise-release-decision-'));
  const evidenceDir = path.join(root, 'evidence');
  mkdirSync(evidenceDir, { recursive: true });
  const evidence = {
    status: 'passed',
    commit_sha: sha,
    branch: 'main',
    generated_at: new Date().toISOString(),
    ...evidenceOverrides
  };
  writeFileSync(path.join(evidenceDir, 'control.json'), JSON.stringify(evidence));
  writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    maximum_evidence_age_days: 30,
    release_branch: 'main',
    required_controls: [{ id: 'TST-01', name: 'Test control', path: 'evidence/control.json', ...(acceptance ? { acceptance } : {}) }]
  }));
  return root;
}

function run(root, extra = []) {
  return spawnSync(process.execPath, [script, '--manifest', path.join(root, 'manifest.json'), '--output', path.join(root, 'decision.json'), '--report', path.join(root, 'decision.md'), '--sha', sha, '--branch', 'main', ...extra], { cwd: root, encoding: 'utf8' });
}

test('emits Go only for exact-SHA fresh passing evidence', () => {
  const root = fixture();
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  const decision = JSON.parse(readFileSync(path.join(root, 'decision.json'), 'utf8'));
  assert.equal(decision.decision, 'Go');
  assert.equal(decision.summary.complete, 1);
  assert.match(decision.controls[0].digest_sha256, /^[a-f0-9]{64}$/);
});

test('fails closed for SHA mismatch', () => {
  const root = fixture({ evidenceOverrides: { commit_sha: 'b'.repeat(40) } });
  const result = run(root);
  assert.equal(result.status, 1);
  const decision = JSON.parse(readFileSync(path.join(root, 'decision.json'), 'utf8'));
  assert.deepEqual(decision.controls[0].failures, ['sha_mismatch']);
});

test('fails closed for stale evidence', () => {
  const root = fixture({ evidenceOverrides: { generated_at: '2020-01-01T00:00:00.000Z' } });
  const result = run(root);
  assert.equal(result.status, 1);
  const decision = JSON.parse(readFileSync(path.join(root, 'decision.json'), 'utf8'));
  assert.ok(decision.controls[0].failures.includes('evidence_stale'));
});

test('rejects evidence containing secret-bearing keys', () => {
  const root = fixture({ evidenceOverrides: { metadata: { access_token: 'redacted' } } });
  const result = run(root);
  assert.equal(result.status, 1);
  const decision = JSON.parse(readFileSync(path.join(root, 'decision.json'), 'utf8'));
  assert.ok(decision.controls[0].failures.includes('sensitive_key_present'));
});

test('requires independent reviewer identity and review time', () => {
  const root = fixture({ acceptance: 'independent_review' });
  const result = run(root);
  assert.equal(result.status, 1);
  const decision = JSON.parse(readFileSync(path.join(root, 'decision.json'), 'utf8'));
  assert.ok(decision.controls[0].failures.includes('independent_review_missing'));
});

test('source contract keeps full SHA, freshness, redaction and all-controls gates', () => {
  const source = readFileSync(script, 'utf8');
  assert.match(source, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(source, /evidence_stale/);
  assert.match(source, /sensitive_key_present/);
  assert.match(source, /complete === controls\.length \? 'Go' : 'No-Go'/);
  execFileSync(process.execPath, ['--check', script]);
});
