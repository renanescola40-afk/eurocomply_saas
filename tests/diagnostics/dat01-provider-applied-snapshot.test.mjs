import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDat01ProviderRecoveryBundle } from '../../scripts/diagnostics/dat01-provider-applied-snapshot.mjs';

const base = 'docs/enterprise/phase1-v22/recovered-provider-statements/';
const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const fixtures = () => ({
  manifest: read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
  parts: [1,2,3,4,5].map(i => read(base + 'part-0' + i + '.json')),
  crosswalk: read(base + 'nonexact-crosswalk-25.json'),
});
const validate = value => validateDat01ProviderRecoveryBundle(value);
const rejects = (value, code) => assert.throws(() => validate(value), new RegExp('DAT01_RECOVERY_' + code));

test('all 34 exact applied SQL bodies match frozen ledger hash, byte count and statement count', () => {
  const result = validate(fixtures());
  assert.equal(result.status, 'PROVIDER_SQL_RECOVERED_REVIEW_REQUIRED');
  assert.equal(result.providerAppliedStatementsRecovered, 34);
  assert.equal(result.totalProviderJoinedUtf8Bytes, 133272);
  assert.equal(result.providerLedgerRowsFrozen, 137);
  assert.equal(result.exactOriginalWholeFilesNewlyProven, 0);
  assert.equal(result.postgres17ReplayExecuted, false);
  assert.equal(result.gateA12, 'BLOCKED');
});

test('25 nonexact mapping decisions preserve 14 byte-evidenced, 11 source-unproven, and 48 unique review cases', () => {
  const result = validate(fixtures());
  assert.equal(result.nonexactMappingsDocumented, 25);
  assert.equal(result.nonexactWithExistingSourceByteProof, 14);
  assert.equal(result.nonexactWithRecoveredProviderSQL, 11);
  assert.equal(result.mappingReviewAcceptances, 0);
  assert.equal(result.totalUniqueReviewCases, 48);
  assert.equal(result.consolidationGroups, 2);
  assert.equal(result.humanReviewerApproval, false);
});

test('validator result never exposes actual SQL statements or secret strings', () => {
  const result = validate(fixtures());
  assert.equal(result.rawSqlEmitted, false);
  assert.equal(JSON.stringify(result).includes('CREATE POLICY'), false);
  assert.equal(JSON.stringify(result).includes('"statements"'), false);
  assert.equal(result.productionWrites, 0);
});

test('one character changed in provider SQL is rejected by SHA256', () => {
  const data = fixtures();
  data.parts[0].records[0].statements[0] += ' ';
  rejects(data, 'PROVIDER_DIGEST_MISMATCH');
});

test('a changed SQL statement count is not silently accepted', () => {
  const data = fixtures();
  data.parts[0].records[0].providerStatementCount += 1;
  rejects(data, 'PROVIDER_IDENTITY_MISMATCH');
});

test('empty or missing statements cannot be accepted as recovered SQL', () => {
  const data = fixtures();
  data.parts[0].records[0].statements[0] = '';
  rejects(data, 'INVALID_STATEMENTS');
});

test('duplicate provider ledger version is rejected even if each part is present', () => {
  const data = fixtures();
  data.parts[1].records[0].providerVersion = data.parts[0].records[0].providerVersion;
  rejects(data, 'DUPLICATE_PROVIDER_VERSION');
});

test('missing part and incorrect part cardinality fail closed', () => {
  const data = fixtures();
  data.parts.pop();
  rejects(data, 'PART_COUNT');
  const altered = fixtures();
  altered.parts[4].rowCount = 8;
  rejects(altered, 'PART_SHAPE');
});

test('provenance parts cannot be spliced from another provider snapshot', () => {
  const data = fixtures();
  data.parts[2].sourceSnapshotSha = 'a'.repeat(40);
  rejects(data, 'SNAPSHOT_IDENTITY');
});

test('provider-applied SQL must never be recast as an original whole-file source', () => {
  const data = fixtures();
  data.parts[0].records[0].originalWholeFileProven = true;
  rejects(data, 'NOT_ORIGINAL_SOURCE');
});

test('provider SQL and provenance records never authorize replay or signoff', () => {
  const data = fixtures();
  data.parts[0].records[0].executableReplayAuthorized = true;
  rejects(data, 'REPLAY_NOT_AUTHORIZED');
  const altered = fixtures();
  altered.parts[2].approvedForReplay = true;
  rejects(altered, 'REPLAY_NOT_AUTHORIZED');
});

test('nonexact mapping tampering cannot approve another provider version', () => {
  const data = fixtures();
  data.crosswalk.records[0].providerVersion = '20260101000000';
  rejects(data, 'CROSSWALK_IDENTITY');
});

test('nonexact mapping human signoff cannot be forged by changing a JSON flag', () => {
  const data = fixtures();
  data.crosswalk.records[0].versionMappingIndependentlyAccepted = true;
  rejects(data, 'CROSSWALK_REVIEW_REQUIRED');
  const altered = fixtures();
  altered.crosswalk.records[0].authorizationToReplay = true;
  rejects(altered, 'CROSSWALK_REVIEW_REQUIRED');
});

test('missing nonexact mapping cannot silently reduce reviewer workload', () => {
  const data = fixtures();
  data.crosswalk.records.pop();
  rejects(data, 'CROSSWALK_COUNT');
});

test('consolidation groups cannot be collapsed or mapped to a different version', () => {
  const data = fixtures();
  const record = data.crosswalk.records.find(x => x.consolidation);
  record.consolidation.otherVersions = [record.providerVersion];
  rejects(data, 'CROSSWALK_IDENTITY');
});

test('frozen source claims cannot be rewritten to make incomplete provenance appear accepted', () => {
  const data = fixtures();
  data.manifest.invariants.independentReviewsApproved = 1;
  rejects(data, 'FROZEN_LEDGER');
});
