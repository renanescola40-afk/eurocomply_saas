import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDat01ReviewQueue } from '../../scripts/diagnostics/dat01-provenance-decision-queue.mjs';

const read = filename => JSON.parse(readFileSync(new URL('../../' + filename, import.meta.url), 'utf8'));
const fixtures = () => ({
  manifest: read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
  history: read('docs/enterprise/phase1-v22/DAT01_GITLAB_HISTORICAL_REVISION_MAP_20261104.json'),
  subspans: read('docs/enterprise/phase1-v22/DAT01_EXACT_PROVIDER_STATEMENT_SUBSPANS_20261104.json'),
});
const build = input => buildDat01ReviewQueue(input);
const failsWith = (data, code) => assert.throws(() => build(data), new RegExp('DAT01_REVIEW_QUEUE_' + code));

test('deduplicates 34 unresolved + 25 nonexact into exactly 48 review decisions', () => {
  const report = build(fixtures());
  assert.equal(report.schema, 'risck-comply.dat01.review-decision-queue.v1');
  assert.deepEqual(report.counts, {
    providerLedgerRows: 137,
    missingWholeFileSourceProof: 34,
    nonexactVersionMappings: 25,
    overlappingIssues: 11,
    uniqueReviewCases: 48,
    statementSubspansNotWholeFiles: 8,
    historicalRenameCasesNotProven: 2,
    consolidationGroups: 2,
    independentlyApprovedReplayRows: 0,
  });
  assert.equal(new Set(report.decisions.map(x => x.providerVersion)).size, 48);
  assert.equal(report.decisions.filter(x => x.historicalCandidate).length, 34);
  assert.equal(report.decisions.filter(x => x.verbatimStatementEvidence).length, 8);
  assert.equal(report.safety.executableManifestProduced, false);
  assert.equal(report.safety.formalEnterpriseGateAccepted, false);
  assert.equal(report.safety.gateA12, 'BLOCKED');
  for (const row of report.decisions) {
    assert.match(row.providerVersion, /^\d{14}$/);
    assert.match(row.providerJoinedSha256, /^[a-f0-9]{64}$/);
    assert.equal(row.independentReviewApproved, false);
    assert.equal(row.executableReplayAuthorized, false);
  }
});

test('distinguishes source-byte proof from nonexact version-identity review', () => {
  const report = build(fixtures());
  const provenMapped = report.decisions.filter(r => r.sourceByteEqualityClaimed);
  assert.equal(provenMapped.length, 14);
  assert.ok(provenMapped.every(r => r.reviewClass === 'VERSION_IDENTITY_REVIEW'));
  assert.ok(provenMapped.every(r =>
    r.requiredIndependentDecisions.includes('PROVIDER_VERSION_TO_SOURCE_MAPPING')));
  assert.equal(report.decisions.filter(r =>
    r.reviewClass === 'ORIGINAL_SOURCE_AND_VERSION_IDENTITY_REVIEW').length, 11);
  assert.equal(report.decisions.filter(r =>
    r.reviewClass === 'ORIGINAL_SOURCE_BYTES_REVIEW').length, 23);
});

test('records sensitive RLS drift as review-only with no automatic replay', () => {
  const record = build(fixtures()).decisions.find(x => x.providerVersion === '20260726070000');
  assert.match(record.historicalRlsPolicyDrift, /APPLIED_USING_TRUE_DIFFERS/);
  assert.ok(record.requiredIndependentDecisions.includes('RLS_HISTORICAL_POLICY_SEMANTICS'));
  assert.equal(record.executableReplayAuthorized, false);
});

test('preserves both distinct production versions of each consolidation', () => {
  const grouped = build(fixtures()).decisions.filter(x => x.consolidation);
  assert.equal(grouped.length, 4);
  for (const row of grouped) {
    assert.equal(row.consolidation.collapsePermitted, false);
    assert.equal(row.consolidation.preserveSeparateVersions.length, 2);
    assert.ok(row.consolidation.preserveSeparateVersions.includes(row.providerVersion));
    assert.ok(row.requiredIndependentDecisions.includes('PRESERVE_DISTINCT_CONSOLIDATED_VERSION_ORDER'));
  }
});

test('unverified provider subspans never become whole-file equality or approval', () => {
  const report = build(fixtures());
  const matching = report.decisions.filter(r => r.verbatimStatementEvidence);
  assert.equal(matching.length, 8);
  assert.ok(matching.every(r => !r.sourceByteEqualityClaimed && !r.executableReplayAuthorized));
  assert.ok(matching.every(r => r.verbatimStatementEvidence.classification.includes('SUBSPAN')));
});

test('fails closed when original draft claims an unauthorized replay or reviewer', () => {
  const data = fixtures();
  data.manifest.records[0].approvedForExecutableReplay = true;
  failsWith(data, 'ROW_APPROVAL_IN_DRAFT');
  const altered = fixtures();
  altered.manifest.records[0].independentReviewer = 'self-approval';
  failsWith(altered, 'ROW_APPROVAL_IN_DRAFT');
});

test('rejects lost historical evidence, wrong provider paths and altered row order', () => {
  const lost = fixtures();
  lost.history.records.pop();
  failsWith(lost, 'HISTORY_COUNT');
  const mismatch = fixtures();
  mismatch.history.records[0].canonicalCrosswalkSource = 'supabase/migrations/forged.sql';
  failsWith(mismatch, 'HISTORY_NOT_BOUND_TO_LEDGER');
  const order = fixtures();
  [order.manifest.records[0], order.manifest.records[1]] =
    [order.manifest.records[1], order.manifest.records[0]];
  failsWith(order, 'ORDER_OR_VERSION');
});

test('rejects forged source proof and provider digest corruption', () => {
  const forged = fixtures();
  forged.manifest.records.find(r => r.sourceByteEqualityConfirmed === false)
    .sourceByteEqualityConfirmed = true;
  failsWith(forged, 'FROZEN_COUNTS_DRIFT');
  const digest = fixtures();
  digest.manifest.records[0].providerJoinedSha256 = 'incorrect';
  failsWith(digest, 'PROVIDER_IDENTITY');
});

test('rejects reclassified statement-only proof and changes to RLS safety boundary', () => {
  const sourceUpgrade = fixtures();
  sourceUpgrade.subspans.records[0].exactSourceSubspan.wholeSourceFileEqualsProviderStatement = true;
  failsWith(sourceUpgrade, 'SUBSPAN_UNSAFE');
  const duplicate = fixtures();
  duplicate.subspans.newStatementLevelRecovery20261106.newRecord.version =
    duplicate.subspans.records[0].version;
  failsWith(duplicate, 'LATEST_SUBSPAN_DUPLICATE');
  const unsafe = fixtures();
  unsafe.history.historicalReconciliationPathTriage20261106.authorizedForReplay = true;
  failsWith(unsafe, 'RLS_RECONCILIATION_DISPOSITION');
});

test('emits stable non-sensitive metadata only and never returns SQL source or provider statements', () => {
  const input = fixtures();
  const one = build(input);
  const two = build(input);
  assert.deepEqual(one, two);
  assert.equal(one.safety.sourceSqlIncluded, false);
  assert.equal(one.safety.databaseAccess, false);
  assert.equal(one.safety.productionWrites, 0);
  assert.equal(one.safety.sqlReplayExecuted, false);
  const serialized = JSON.stringify(one);
  assert.equal(serialized.includes('"statements"'), false);
  assert.equal(serialized.includes('"sql"'), false);
  assert.equal(serialized.includes('CREATE POLICY'), false);
});

test('committed review queue is reproducible byte-for-byte as JSON data', () => {
  const generated = build(fixtures());
  const committed = read('docs/enterprise/phase1-v22/DAT01_PROVENANCE_REVIEW_DECISIONS_20261106.json');
  assert.deepEqual(committed, generated);
  assert.equal(committed.safety.independentHumanApproval, false);
  assert.equal(committed.counts.independentlyApprovedReplayRows, 0);
});

test('rejects contradictory verified source bytes even when 34 unresolved counts stay unchanged', () => {
  const contradictory = fixtures();
  const record = contradictory.manifest.records.find(r => r.sourceByteEqualityConfirmed === true);
  assert.ok(record);
  record.sourceByteProof.status = 'NO_PROVEN_WHOLE_SOURCE_BYTES';
  failsWith(contradictory, 'SOURCE_PROOF_STATUS_CONTRADICTION');
});

test('rejects identity qualification claims before independent review', () => {
  const forged = fixtures();
  const record = forged.manifest.records.find(r => r.mappingType === 'exact_version');
  assert.ok(record);
  record.identityQualified = 'INDEPENDENTLY_APPROVED';
  failsWith(forged, 'IDENTITY_QUALIFICATION_CONTRADICTION');
});

test('the real frozen ledger maintains approved source-status and identity classifications', () => {
  const input = fixtures();
  const verifiedStatuses = new Set([
    'CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED',
    'IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED',
    'ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING',
    'CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING',
  ]);
  for (const record of input.manifest.records) {
    const expectedStatus = record.sourceByteEqualityConfirmed
      ? verifiedStatuses.has(record.sourceByteProof.status)
      : record.sourceByteProof.status === 'NO_PROVEN_WHOLE_SOURCE_BYTES';
    assert.equal(expectedStatus, true, 'proof contradiction at ' + record.version);
    assert.equal(record.identityQualified, record.mappingType === 'exact_version'
      ? 'EXACT_VERSION_METADATA_ONLY' : 'NONEXACT_MAPPING_REVIEW_REQUIRED');
  }
  assert.equal(build(input).counts.uniqueReviewCases, 48);
  assert.equal(build(input).safety.gateA12, 'BLOCKED');
});
