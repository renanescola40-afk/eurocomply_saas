import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDat01LedgerBoundManifest } from '../../scripts/diagnostics/dat01-ledger-bound-manifest-preflight.mjs';

const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const original = () => ({
  manifest: read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
  frozenLedger: read('docs/enterprise/closure-v20/DAT01_PROD_LEDGER_READONLY_HASHES_20261103.json'),
  crosswalk: read('supabase/reconciliation/20261022_production_migration_source_crosswalk.json'),
});
const check = value => validateDat01LedgerBoundManifest(value);

test('137 frozen ledger rows and mapped sources are structurally consistent, not approved', () => {
  const r = check(original());
  assert.deepEqual(r.errors, []);
  assert.equal(r.status, 'STRUCTURALLY_CONSISTENT_BLOCKED');
  assert.equal(r.inspected, 137);
  assert.equal(r.uniqueLedgerVersions, 137);
  assert.equal(r.exactVersionMappings, 112);
  assert.equal(r.nonexactIdentityMappings, 25);
  assert.equal(r.sourceByteProofClaims, 103);
  assert.equal(r.unresolvedSourceByteClaims, 34);
  assert.equal(r.consolidationGroups, 2);
  assert.equal(r.replayAuthorized, false);
  assert.equal(r.formalAcceptanceGranted, false);
});

test('detects a changed provider SQL digest and refuses to grant acceptance', () => {
  const value = original();
  value.manifest.records[0].providerJoinedSha256 = '0'.repeat(64);
  const r = check(value);
  assert.ok(r.errors.some(e => e.code === 'PROVIDER_DIGEST_OR_SIZE_MISMATCH'));
  assert.equal(r.replayAuthorized, false);
});

test('detects misordered or renamed ledger entries', () => {
  const value = original();
  [value.manifest.records[0], value.manifest.records[1]] = [value.manifest.records[1], value.manifest.records[0]];
  assert.ok(check(value).errors.some(e => e.code === 'ORDER_OR_IDENTITY_MISMATCH'));
});

test('rejects a forged source-proof claim or premature replay approval', () => {
  const value = original();
  const unproven = value.manifest.records.find(r => !r.sourceByteEqualityConfirmed);
  unproven.sourceByteEqualityConfirmed = true;
  value.manifest.records[0].approvedForExecutableReplay = true;
  const r = check(value);
  assert.ok(r.errors.some(e => e.code === 'SOURCE_PROOF_FLAG_MISMATCH'));
  assert.ok(r.errors.some(e => e.code === 'EXECUTABLE_APPROVAL_IN_DRAFT'));
});

test('rejects undeclared or inconsistent consolidation groups', () => {
  const value = original();
  value.crosswalk.consolidated_sources = [];
  assert.ok(check(value).errors.some(e => e.code === 'CONSOLIDATION_MISMATCH'));
});

test('rejects a false independent-review signoff on a draft', () => {
  const value = original();
  value.manifest.records[0].independentReviewer = 'self-approved';
  assert.ok(check(value).errors.some(e => e.code === 'REVIEW_IN_DRAFT'));
});
