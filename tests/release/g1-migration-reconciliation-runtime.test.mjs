import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('scripts/supabase/compile-migration-reconciliation.mjs');
const sha = 'a'.repeat(40);
const otherSha = 'c'.repeat(40);
const fileDigest = 'b'.repeat(64);
const digest = (value) => createHash('sha256').update(value).digest('hex');

function candidate() {
  const inventory = {
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    remoteVersions: ['20261001000000'],
    items: [{
      version: '20261001000000',
      filename: '20261001000000_test.sql',
      sha256: fileDigest,
      classificationReasons: ['LOCAL_ONLY_VERSION'],
    }],
  };
  const raw = JSON.stringify(inventory) + '\n';
  const decisions = {
    schema: 'risck-comply.supabase-migration-reconciliation-decisions.v1',
    targetSha: sha,
    inventorySha256: digest(raw),
    productionProjectRef: 'sample-prod-ref',
    productionSchemaDumpDigest: 'd'.repeat(64),
    remoteMigrationListDigest: 'e'.repeat(64),
    reviewedBy: 'Independent database reviewer',
    reviewedAt: '2026-10-21T10:00:00Z',
    approvedBy: 'Distinct approver',
    approvedAt: '2026-10-21T11:00:00Z',
    items: [{
      version: '20261001000000',
      filename: '20261001000000_test.sql',
      sha256: fileDigest,
      classification: 'ARCHIVE_LEGACY',
      rationale: 'Reviewed historical item with an independent source reference.',
      schemaEvidenceReference: 'immutable-review-evidence',
      reviewer: 'Database reviewer',
      reviewedAt: '2026-10-21T10:00:00Z',
    }],
  };
  return { inventory, decisions };
}

function run(change = () => {}, envSha = sha) {
  const dir = mkdtempSync(join(tmpdir(), 'risck-reconcile-'));
  const input = join(dir, 'inventory.json');
  const decisionsPath = join(dir, 'decisions.json');
  const out = join(dir, 'result');
  const data = candidate();
  try {
    change(data);
    writeFileSync(input, JSON.stringify(data.inventory) + '\n');
    writeFileSync(decisionsPath, JSON.stringify(data.decisions) + '\n');
    // Inventory binding can be deliberately recomputed for cases other than digest-tampering.
    const env = { ...process.env, TARGET_SHA: envSha };
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [script, input, decisionsPath, out], {
        cwd: resolve('.'),
        env,
        stdio: 'pipe',
        timeout: 10000,
      });
    } catch (error) {
      exitCode = error.status ?? 1;
    }
    const result = JSON.parse(readFileSync(join(out, 'migration-reconciliation-result.json'), 'utf8'));
    return { exitCode, ...result };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('complete controlled synthetic decision can reach staging review without authorizing writes', () => {
  const actual = run();
  assert.equal(actual.exitCode, 0);
  assert.equal(actual.status, 'READY_FOR_STAGING_REHEARSAL');
  assert.equal(actual.safety.productionPushAuthorized, false);
  assert.equal(actual.safety.databaseModified, false);
});

test('mismatched exact source SHA must fail closed', () => {
  const actual = run(() => {}, otherSha);
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('target SHA mismatch'));
});

test('missing TARGET_SHA must fail closed', () => {
  const actual = run(() => {}, '');
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.some((message) => message.includes('TARGET_SHA')));
});

test('inventory bytes changed after review must fail closed', () => {
  const actual = run(({ inventory }) => { inventory.remoteVersions.push('20261001000001'); });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('inventory digest mismatch'));
});

test('unresolved split-review must never count as ready', () => {
  const actual = run(({ decisions }) => { decisions.items[0].classification = 'REQUIRES_SPLIT_REVIEW'; });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.some((message) => message.includes('split review unresolved')));
});

test('missing remote migration list must fail closed', () => {
  const actual = run(({ inventory }) => { inventory.remoteVersions = []; });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.some((message) => message.includes('remote migration ledger versions missing')));
});

test('placeholder approval must fail closed', () => {
  const actual = run(({ decisions }) => { decisions.approvedBy = 'REPLACE_WITH_APPROVER'; });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('reviewer and approver must be distinct'));
});

test('unverified schema and provider ledger digests must fail closed', () => {
  const actual = run(({ decisions }) => { decisions.productionSchemaDumpDigest = 'REPLACE_WITH_SHA256'; });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('production schema dump digest missing'));
});

test('extra approved item absent from source inventory must fail closed', () => {
  const actual = run(({ decisions }) => {
    decisions.items.push({ ...decisions.items[0], version: '20261001000001', filename: '20261001000001_fake.sql' });
  });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.some((message) => message.includes('decision not present in inventory')));
});

test('future review decisions must fail closed', () => {
  const actual = run(({ decisions }) => { decisions.reviewedAt = '2099-01-01T00:00:00Z'; });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('review timestamps must not be future'));
});

test('invalid inventory file digest must fail closed', () => {
  const actual = run(({ inventory, decisions }) => {
    inventory.items[0].sha256 = 'invalid';
    decisions.items[0].sha256 = 'invalid';
  });
  assert.notEqual(actual.exitCode, 0);
  assert.ok(actual.errors.includes('invalid inventory file digest'));
});
