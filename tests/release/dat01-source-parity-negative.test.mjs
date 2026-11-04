import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compareLedger } from '../../scripts/diagnostics/g5-02-sql-hash-proof.mjs';

const hash = s => createHash('sha256').update(s).digest('hex');
function fixture() {
  const versions = Array.from({ length: 137 }, (_, i) => String(20260605000000 + i));
  const entries = versions.map((v, i) => ({ order: i + 1, production_version: v,
    production_name: 'fixture_' + i, source: 'supabase/migrations/' + v + '_fixture.sql', mapping: 'exact_version' }));
  const rows = versions.map((v, i) => ({ version: v, name: 'fixture_' + i,
    statement_count: 1, joined_bytes: 8, joined_statement_sha256: hash('select 1') }));
  return { ledger: { versions }, crosswalk: { entries }, provider: { rows }, readSource: () => 'select 1;' };
}
test('synthetic 137/137 parity never creates formal acceptance', () => {
  const r = compareLedger(fixture());
  assert.equal(r.counts.exactMatch, 137);
  assert.equal(r.formalAcceptance, 'NOT_GRANTED');
  assert.equal(r.sqlReplay, 'NOT_EXECUTED');
});
test('tampered provider digest fails closed', () => {
  const f = fixture(); f.provider.rows[43].joined_statement_sha256 = hash('select 2');
  const r = compareLedger(f);
  assert.equal(r.counts.exactMismatch, 1);
  assert.equal(r.counts.exactMatch, 136);
});
test('changed source SQL is not misidentified as parity', () => {
  const f = fixture(), target = f.crosswalk.entries[50].source;
  f.readSource = p => p === target ? 'select 2;' : 'select 1;';
  assert.equal(compareLedger(f).counts.exactMismatch, 1);
});
test('nonexact mapping requires independent review even when hashes match', () => {
  const f = fixture(); f.crosswalk.entries[7].mapping = 'canonical_name_match';
  const r = compareLedger(f);
  assert.equal(r.counts.nonExactMatchNeedsReview, 1);
  assert.equal(r.counts.exactMatch, 136);
});
test('crosswalk order and provider name mismatches are rejected', () => {
  const f = fixture(); f.crosswalk.entries[12].order = 99;
  assert.throws(() => compareLedger(f), /ORDER_OR_IDENTITY_13/);
  const n = fixture(); n.provider.rows[7].name = 'wrong';
  assert.throws(() => compareLedger(n), /ORDER_OR_IDENTITY_8/);
});
test('unsafe source paths and malformed provider hashes are rejected', () => {
  const f = fixture(); f.crosswalk.entries[3].source = '../outside.sql';
  assert.throws(() => compareLedger(f), /UNTRUSTED_PATH_OR_HASH_4/);
  const n = fixture(); n.provider.rows[4].joined_statement_sha256 = 'bogus';
  assert.throws(() => compareLedger(n), /UNTRUSTED_PATH_OR_HASH_5/);
});
test('missing and unterminated source SQL remain unverified', () => {
  const f = fixture(), target = f.crosswalk.entries[99].source;
  f.readSource = p => { if (p === target) throw Error('MISSING'); return 'select 1;'; };
  assert.equal(compareLedger(f).counts.unverified, 1);
  const n = fixture(), broken = n.crosswalk.entries[101].source;
  n.readSource = p => p === broken ? 'select 1' : 'select 1;';
  assert.equal(compareLedger(n).counts.unverified, 1);
});
