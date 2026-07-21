import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildManifest } from '../../scripts/enterprise/build-enterprise-evidence-manifest.mjs';

const SHA = 'a'.repeat(40);
function valid(overrides = {}) {
  return {
    evidenceItem: 'tenant-isolation-runtime',
    targetSha: SHA,
    observedSha: SHA,
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-21T12:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    githubRunId: '12345',
    controlsVerified: ['TENANT-001', 'RLS-001'],
    evidenceIntegrity: { containsSensitiveValues: false },
    ...overrides,
  };
}
function fixture(documents) {
  const root = mkdtempSync(join(tmpdir(), 'evidence-manifest-'));
  mkdirSync(join(root, 'runtime'));
  documents.forEach((document, index) => writeFileSync(join(root, 'runtime', `${index}.json`), JSON.stringify(document)));
  return root;
}

test('builds a deterministic promotion-ready manifest', () => {
  const result = buildManifest({ root: fixture([valid()]), targetSha: SHA, repository: 'renanescola40-afk/eurocomply_saas', generatedAt: '2026-07-21T13:00:00.000Z' });
  assert.equal(result.summary.decision, 'READY_FOR_PROMOTION');
  assert.equal(result.summary.acceptedItems, 1);
  assert.equal(result.summary.controlsReferenced, 2);
  assert.equal(result.items[0].runId, '12345');
  assert.match(result.integrity.sha256, /^[a-f0-9]{64}$/);
});

test('rejects SHA-mismatched evidence', () => {
  const result = buildManifest({ root: fixture([valid({ observedSha: 'b'.repeat(40) })]), targetSha: SHA, repository: 'renanescola40-afk/eurocomply_saas' });
  assert.equal(result.summary.decision, 'NO_GO');
  assert.equal(result.items.length, 0);
  assert.ok(result.rejected[0].failures.includes('exact-SHA provenance mismatch'));
});

test('rejects secret-shaped evidence', () => {
  const result = buildManifest({ root: fixture([valid({ accessToken: 'must-not-exist' })]), targetSha: SHA, repository: 'renanescola40-afk/eurocomply_saas' });
  assert.equal(result.summary.decision, 'NO_GO');
  assert.ok(result.rejected[0].failures.includes('sensitive key/value shape detected'));
});

test('rejects incomplete evidence and empty control references', () => {
  const result = buildManifest({ root: fixture([valid({ status: 'Open', controlsVerified: [] })]), targetSha: SHA, repository: 'renanescola40-afk/eurocomply_saas' });
  assert.equal(result.summary.acceptedItems, 0);
  assert.ok(result.rejected[0].failures.includes('evidence is not Complete/passed'));
  assert.ok(result.rejected[0].failures.includes('controlsVerified missing'));
});

test('forbids duplicate evidence identity', () => {
  const root = fixture([valid(), valid()]);
  assert.throws(() => buildManifest({ root, targetSha: SHA, repository: 'renanescola40-afk/eurocomply_saas' }), /Duplicate evidenceItem\/runId/);
});
