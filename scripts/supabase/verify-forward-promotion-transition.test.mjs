import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyForwardPromotionTransition } from './verify-forward-promotion-transition.mjs';

const sha = 'a'.repeat(40);
const manifest = {
  schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
  targetSha: sha,
  selectionDigest: `sha256:${'b'.repeat(64)}`,
  changeSet: 'test-forward-promotion',
  migrations: [
    { version: '20260815083000' },
    { version: '20260815120000' },
  ],
  checks: {
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    unrestrictedDbPushAuthorized: false,
  },
};

test('accepts exactly remote-before plus the selected forward set', () => {
  const evidence = verifyForwardPromotionTransition({
    manifest,
    remoteBefore: ['20260813124224', '20260813090000'],
    remoteAfter: ['20260815120000', '20260813090000', '20260815083000', '20260813124224'],
    expectedSha: sha,
    generatedAt: '2026-08-15T12:00:00.000Z',
  });

  assert.equal(evidence.status, 'Complete');
  assert.deepEqual(evidence.appliedVersions, ['20260815083000', '20260815120000']);
  assert.equal(evidence.checks.remoteAfterEqualsBeforePlusSelected, true);
  assert.equal(evidence.checks.unauthorizedMigrationApplied, false);
  assert.equal(evidence.evidenceIntegrity.containsSensitiveValues, false);
});

test('rejects a selected migration that was already present before promotion', () => {
  assert.throws(() => verifyForwardPromotionTransition({
    manifest,
    remoteBefore: ['20260813124224', '20260815083000'],
    remoteAfter: ['20260813124224', '20260815083000', '20260815120000'],
    expectedSha: sha,
  }), /already present before promotion/);
});

test('rejects any unauthorized migration added during promotion', () => {
  assert.throws(() => verifyForwardPromotionTransition({
    manifest,
    remoteBefore: ['20260813124224'],
    remoteAfter: ['20260813124224', '20260815083000', '20260815120000', '20260815999999'],
    expectedSha: sha,
  }), /not exactly remote-before plus the selected set/);
});

test('rejects deletion or loss of existing remote history', () => {
  assert.throws(() => verifyForwardPromotionTransition({
    manifest,
    remoteBefore: ['20260813090000', '20260813124224'],
    remoteAfter: ['20260813124224', '20260815083000', '20260815120000'],
    expectedSha: sha,
  }), /not exactly remote-before plus the selected set/);
});

test('rejects exact-SHA mismatch and authorizing manifests', () => {
  assert.throws(() => verifyForwardPromotionTransition({
    manifest,
    remoteBefore: ['20260813124224'],
    remoteAfter: ['20260813124224', '20260815083000', '20260815120000'],
    expectedSha: 'c'.repeat(40),
  }), /target SHA mismatch/);

  assert.throws(() => verifyForwardPromotionTransition({
    manifest: { ...manifest, checks: { ...manifest.checks, productionWriteAuthorized: true } },
    remoteBefore: ['20260813124224'],
    remoteAfter: ['20260813124224', '20260815083000', '20260815120000'],
    expectedSha: sha,
  }), /must remain non-authorizing/);
});
