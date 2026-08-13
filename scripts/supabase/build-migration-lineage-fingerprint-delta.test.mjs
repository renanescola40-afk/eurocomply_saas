import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMigrationLineageFingerprintDelta } from './build-migration-lineage-fingerprint-delta.mjs';

const sourceDigest = '1'.repeat(64);
const targetDigest = '2'.repeat(64);
const schema = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
const item = (filename, digest) => ({ filename, sha256: digest, version: '20260101000000' });
const inventory = (items) => ({ schema, items });
const records = (rows, extras = {}) => ({ schema: 'risck-comply.supabase-migration-owner-review-records.v1', inventorySha256: sourceDigest, records: rows, unresolvedCredits: [], quarantinedHistoricalCredits: [], ...extras });
const row = (filename, digest) => ({ filename, sha256: digest });
const build = (sourceItems, targetItems, rows, extras) => buildMigrationLineageFingerprintDelta({ sourceInventory: inventory(sourceItems), sourceInventorySha256: sourceDigest, targetInventory: inventory(targetItems), targetInventorySha256: targetDigest, recordSet: records(rows, extras) });

describe('migration lineage fingerprint delta', () => {
  it('separates exact, changed, removed and current unmatched fingerprints', () => {
    const a = 'a'.repeat(64); const b = 'b'.repeat(64); const c = 'c'.repeat(64); const d = 'd'.repeat(64);
    const result = build([item('a.sql', a), item('b.sql', b), item('gone.sql', d)], [item('a.sql', a), item('b.sql', c), item('new.sql', d)], [row('a.sql', a), row('b.sql', b), row('gone.sql', d)]);
    assert.equal(result.status, 'FINGERPRINT_DELTA_READY');
    assert.equal(result.counts.exactMatches, 1);
    assert.equal(result.counts.changedMatches, 1);
    assert.equal(result.counts.removedHistorical, 1);
    assert.equal(result.counts.currentUnmatched, 2);
    assert.equal(result.safety.historicalRecordSetCreditedToTarget, false);
  });

  it('blocks unresolved historical claims instead of selecting target items around them', () => {
    const a = 'a'.repeat(64);
    const result = build([item('a.sql', a)], [item('a.sql', a)], [row('a.sql', a)], { unresolvedCredits: [{ count: 1 }] });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.counts.unresolvedHistoricalClaims, 1);
    assert.equal(result.safety.unresolvedClaimsCanSelectTargetItems, false);
  });

  it('deduplicates identical rows and rejects record-set inventory rebinding', () => {
    const a = 'a'.repeat(64);
    const duplicate = build([item('a.sql', a)], [item('a.sql', a)], [row('a.sql', a), row('a.sql', a)]);
    assert.equal(duplicate.counts.historicalUniqueFingerprints, 1);
    assert.equal(duplicate.counts.duplicateHistoricalRows, 1);
    const rebound = buildMigrationLineageFingerprintDelta({ sourceInventory: inventory([item('a.sql', a)]), sourceInventorySha256: sourceDigest, targetInventory: inventory([item('a.sql', a)]), targetInventorySha256: targetDigest, recordSet: records([row('a.sql', a)], { inventorySha256: 'f'.repeat(64) }) });
    assert.equal(rebound.status, 'BLOCKED');
  });
});
