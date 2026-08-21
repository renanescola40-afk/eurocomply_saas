import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBoundedMigrationInventory } from './build-bounded-migration-reconciliation-inventory.mjs';

const subject = 'a'.repeat(40);
const digestA = '1'.repeat(64);
const digestB = '2'.repeat(64);
const digestOther = '3'.repeat(64);
const sourceGeneratedAt = '2026-08-21T00:00:00.000Z';

function fixture() {
  const sourceInventory = {
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    generatedAt: sourceGeneratedAt,
    allowedClassifications: [
      'ALREADY_PRESENT_IN_SCHEMA',
      'PENDING_DEPLOYMENT',
      'SUPERSEDED',
      'ARCHIVE_LEGACY',
      'REQUIRES_SPLIT_REVIEW',
    ],
    items: [
      {
        filename: '20260814090000_first.sql',
        version: '20260814090000',
        sha256: digestA,
        classificationReasons: ['LOCAL_ONLY_VERSION'],
      },
      {
        filename: '20260814091000_second.sql',
        version: '20260814091000',
        sha256: digestB,
        classificationReasons: ['LOCAL_ONLY_VERSION'],
      },
      {
        filename: '20260601000000_historical.sql',
        version: '20260601000000',
        sha256: digestOther,
        classificationReasons: ['REMOTE_ONLY_VERSION'],
      },
    ],
  };
  const sourceInventoryBytes = Buffer.from(`${JSON.stringify(sourceInventory, null, 2)}\n`);
  const forwardManifest = {
    schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
    targetSha: subject,
    selectionDigest: `sha256:${'f'.repeat(64)}`,
    changeSet: 'v17-test',
    migrations: [
      {
        version: '20260814091000',
        filename: '20260814091000_second.sql',
        sha256: digestB,
        purpose: 'second purpose',
      },
      {
        version: '20260814090000',
        filename: '20260814090000_first.sql',
        sha256: digestA,
        purpose: 'first purpose',
      },
    ],
  };
  return { sourceInventory, sourceInventoryBytes, forwardManifest };
}

test('builds only the exact manifest identities in manifest order without classifying them', () => {
  const value = fixture();
  const bounded = buildBoundedMigrationInventory({ ...value, expectedSha: subject });

  assert.equal(bounded.generatedAt, sourceGeneratedAt);
  assert.equal(bounded.boundedSelection.selectedCount, 2);
  assert.equal(bounded.boundedSelection.targetSha, subject);
  assert.equal(bounded.boundedSelection.automaticClassificationPerformed, false);
  assert.equal(bounded.boundedSelection.productionWriteAuthorized, false);
  assert.deepEqual(bounded.items.map((item) => item.filename), [
    '20260814091000_second.sql',
    '20260814090000_first.sql',
  ]);
  assert.deepEqual(bounded.items.map((item) => item.boundedOrder), [1, 2]);
  assert.deepEqual(bounded.items.map((item) => item.forwardPurpose), ['second purpose', 'first purpose']);
  assert.equal(bounded.items.some((item) => item.filename === '20260601000000_historical.sql'), false);
});

test('is byte-stable across Decision Gate reruns and ignores caller wall-clock metadata', () => {
  const value = fixture();
  const first = buildBoundedMigrationInventory({
    ...value,
    expectedSha: subject,
    generatedAt: '2026-08-21T01:00:00.000Z',
  });
  const second = buildBoundedMigrationInventory({
    ...value,
    expectedSha: subject,
    generatedAt: '2026-08-21T02:00:00.000Z',
  });

  assert.equal(first.generatedAt, sourceGeneratedAt);
  assert.equal(second.generatedAt, sourceGeneratedAt);
  assert.equal(`${JSON.stringify(first, null, 2)}\n`, `${JSON.stringify(second, null, 2)}\n`);
});

test('fails closed when a selected SHA-256 does not exist in the source inventory', () => {
  const value = fixture();
  value.forwardManifest.migrations[0].sha256 = '4'.repeat(64);
  assert.throws(
    () => buildBoundedMigrationInventory({ ...value, expectedSha: subject }),
    /selected migration is absent from production dry-run inventory/,
  );
});

test('fails closed when the forward manifest belongs to a different subject SHA', () => {
  const value = fixture();
  assert.throws(
    () => buildBoundedMigrationInventory({ ...value, expectedSha: 'b'.repeat(40) }),
    /target SHA mismatch/,
  );
});
