import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMigrationLineageFingerprintDelta } from './build-migration-lineage-fingerprint-delta.mjs';

test('migration lineage fingerprint delta exports its deterministic builder', () => {
  assert.equal(typeof buildMigrationLineageFingerprintDelta, 'function');
});
