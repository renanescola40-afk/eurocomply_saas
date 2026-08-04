import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';
import {
  buildP0EvidenceRegister,
  renderP0EvidenceRegisterMarkdown,
} from '../../scripts/security/generate-p0-runtime-evidence-register.mjs';

const SHA = 'a'.repeat(40);
const NOW = new Date('2026-08-04T10:30:00.000Z');

function write(root, relativePath, content) {
  const output = join(root, relativePath);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'risck-p0-register-'));
  const manifest = {
    name: 'eurocomply-saas',
    packageManager: 'npm@10.8.2',
    dependencies: { next: '15.5.9' },
    devDependencies: { typescript: '5.9.3' },
  };
  const lockfile = {
    name: 'eurocomply-saas',
    lockfileVersion: 3,
    packages: { '': { name: 'eurocomply-saas' } },
  };
  const rows = p0EvidenceCatalog.map((entry) => (
    `| ${entry.item} | Complete | Canonical evidence requirement for ${entry.item} | Release owner | Produce exact-SHA canonical evidence |`
  ));
  write(root, 'package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  write(root, 'package-lock.json', `${JSON.stringify(lockfile, null, 2)}\n`);
  write(root, 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', [
    '# P0 Runtime Evidence Register Policy',
    '',
    '| Evidence item | Status | Required evidence | Owner | Next action |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'));
  return root;
}

test('derives runtime status from evidence instead of legacy Markdown status', () => {
  const root = fixture();
  try {
    const register = buildP0EvidenceRegister({ root, expectedCommitSha: SHA, now: NOW });
    const runtimeControls = register.controls.filter((control) => control.kind === 'runtime');
    assert.equal(register.decision, 'NO_GO');
    assert.ok(runtimeControls.length > 0);
    assert.ok(runtimeControls.every((control) => control.status === 'Open'));
    assert.ok(runtimeControls.every((control) => control.legacyRegisterStatus === 'Complete'));
    assert.ok(runtimeControls.every((control) => control.legacyRegisterDrift === true));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('verifies deterministic repository controls without promoting runtime evidence', () => {
  const root = fixture();
  try {
    const register = buildP0EvidenceRegister({ root, expectedCommitSha: SHA, now: NOW });
    const repositoryControls = register.controls.filter((control) => control.kind === 'repository');
    assert.equal(repositoryControls.length, 2);
    assert.ok(repositoryControls.every((control) => control.status === 'Complete'));
    assert.ok(register.completed >= 2);
    assert.ok(register.blocked > 0);
    assert.notEqual(register.completionPercent, 100);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed for an invalid or absent exact SHA', () => {
  const root = fixture();
  try {
    assert.throws(
      () => buildP0EvidenceRegister({ root, expectedCommitSha: 'short', now: NOW }),
      /expected_commit_sha_invalid/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('renders a bounded Markdown report without raw table injection', () => {
  const register = {
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha: SHA,
    generatedAt: NOW.toISOString(),
    decision: 'NO_GO',
    completed: 0,
    total: 1,
    completionPercent: 0,
    truthBoundary: 'Evidence remains blocked.',
    sha256: 'b'.repeat(64),
    controls: [{
      item: 'Injected | row\nnext',
      kind: 'runtime',
      status: 'Open',
      evidenceFile: 'safe.json',
      evidenceStatus: 'missing',
      evidenceOutcome: 'blocked',
      validatorFailures: ['bad | failure\nline'],
      requiredEvidence: 'Evidence',
      owner: 'Owner | attacker',
      nextAction: 'Run check\nnow',
    }],
  };
  const markdown = renderP0EvidenceRegisterMarkdown(register);
  assert.doesNotMatch(markdown, /Injected \| row/);
  assert.doesNotMatch(markdown, /Owner \| attacker/);
  assert.match(markdown, /Injected row next/);
});
