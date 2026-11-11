#!/usr/bin/env node
// Forensic proof only: authenticated provider-stored applied SQL != original
// whole migration source file. No database clients, SQL replay or approvals.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const PREFIX = 'docs/enterprise/phase1-v22/recovered-provider-statements/';
const PART_SCHEMA = 'risck-comply.dat01.provider-applied-statement-recovery.v1';
const CROSSWALK_SCHEMA = 'risck-comply.dat01.nonexact-provider-version-crosswalk.v1';
const MANIFEST_SCHEMA = 'risck-comply.dat01.ledger-bound-source-provenance-draft.v1';
const VERSION = /^\d{14}$/;
const HASH = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;

function assert(condition, code) {
  if (!condition) throw new Error('DAT01_RECOVERY_' + code);
}

function expectedCrosswalkDisposition(entry) {
  if (entry.mappingType === 'superseded_by_forward_reconciliation')
    return 'KEEP_ORIGINAL_APPLIED_VERSION_AND_REVIEW_HISTORICAL_REPLAY_EXCEPTION';
  if (entry.consolidation)
    return 'KEEP_BOTH_LEDGER_VERSIONS_DISTINCT_WITH_ORDER_AND_SOURCE_EXCEPTION_REVIEW';
  return 'VERIFY_PROVIDER_VERSION_TO_FILENAME_ALIAS_WITH_HASH_AND_SQL_SEMANTICS';
}

export function validateDat01ProviderRecoveryBundle({ manifest, parts, crosswalk } = {}) {
  assert(manifest?.schema === MANIFEST_SCHEMA &&
    manifest.state === 'DRAFT_NOT_EXECUTABLE_NOT_APPROVED' &&
    SHA.test(manifest.sourceSnapshotSha || '') &&
    manifest.records?.length === 137 &&
    manifest.invariants?.independentReviewsApproved === 0 &&
    manifest.invariants?.postgres17Replayed === 0 &&
    manifest.invariants?.formalGateA12 === 'BLOCKED',
    'FROZEN_LEDGER');

  const ledger = manifest.records;
  const sourceUnknown = ledger.filter(row => row.sourceByteEqualityConfirmed === false);
  const nonexact = ledger.filter(row => row.mappingType !== 'exact_version');
  const unresolvedSet = new Set(sourceUnknown.map(row => row.version));
  const reviewedSet = new Set(nonexact.map(row => row.version));
  const uniqueCases = new Set([...unresolvedSet, ...reviewedSet]);
  assert(sourceUnknown.length === 34 && nonexact.length === 25 &&
    uniqueCases.size === 48 && ledger.every((row, i) =>
      row.order === i + 1 && VERSION.test(row.version || '') &&
      HASH.test(row.providerJoinedSha256 || '') &&
      row.approvedForExecutableReplay === false &&
      row.independentReviewer === 'PENDING'),
    'FROZEN_LEDGER');

  assert(Array.isArray(parts) && parts.length === 5, 'PART_COUNT');
  const recovered = [];
  const seen = new Set();
  const expectedParts = [8, 8, 8, 8, 2];
  let totalBytes = 0;

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    assert(part?.schema === PART_SCHEMA && part.part === i + 1 &&
      part.partCount === 5 && part.rowCount === expectedParts[i] &&
      part.records?.length === expectedParts[i] &&
      part.classification === 'PROVIDER_APPLIED_STATEMENTS_NOT_ORIGINAL_SOURCE_FILE' &&
      part.sourceSqlIncluded === true && part.productionWrites === 0,
      'PART_SHAPE');
    assert(part.sourceSnapshotSha === manifest.sourceSnapshotSha,
      'SNAPSHOT_IDENTITY');
    assert(part.approvedForReplay === false, 'REPLAY_NOT_AUTHORIZED');

    for (const record of part.records) {
      assert(VERSION.test(record?.providerVersion || ''), 'PROVIDER_IDENTITY_MISMATCH');
      assert(!seen.has(record.providerVersion), 'DUPLICATE_PROVIDER_VERSION');
      seen.add(record.providerVersion);
      const original = ledger.find(x => x.version === record.providerVersion);
      assert(original && unresolvedSet.has(record.providerVersion) &&
        record.providerName === original.name &&
        record.providerJoinedSha256 === original.providerJoinedSha256 &&
        record.providerJoinedUtf8Bytes === original.providerJoinedUtf8Bytes &&
        record.providerStatementCount === original.providerStatementCount &&
        record.mappingType === original.mappingType &&
        record.canonicalCandidatePath === original.canonicalSourcePath &&
        record.provenance === 'AUTHENTICATED_SUPABASE_PRODUCTION_APPLIED_STATEMENTS',
        'PROVIDER_IDENTITY_MISMATCH');
      assert(record.originalWholeFileProven === false, 'NOT_ORIGINAL_SOURCE');
      assert(record.independentReviewerApproved === false &&
        record.executableReplayAuthorized === false, 'REPLAY_NOT_AUTHORIZED');
      assert(Array.isArray(record.statements) &&
        record.statements.length === original.providerStatementCount &&
        record.statements.every(sql => typeof sql === 'string' && sql.length > 0),
        'INVALID_STATEMENTS');

      const joined = record.statements.join('\n');
      const joinedBytes = Buffer.byteLength(joined, 'utf8');
      const digest = createHash('sha256').update(joined, 'utf8').digest('hex');
      assert(joinedBytes === original.providerJoinedUtf8Bytes &&
        digest === original.providerJoinedSha256, 'PROVIDER_DIGEST_MISMATCH');
      totalBytes += joinedBytes;
      recovered.push(record.providerVersion);
    }
  }
  assert(recovered.length === 34 && recovered.every((version, i) =>
    version === sourceUnknown[i].version), 'PROVIDER_COVERAGE');
  assert(totalBytes === 133272, 'PROVIDER_COVERAGE');

  assert(crosswalk?.schema === CROSSWALK_SCHEMA &&
    crosswalk.sourceSnapshotSha === manifest.sourceSnapshotSha &&
    crosswalk.kind === 'RECOVERY_AND_QUALIFIED_REVIEW_DECISION_NOT_AUTO_ACCEPTANCE' &&
    crosswalk.preserveOriginalLedgerOrder === true &&
    crosswalk.productionWrites === 0 && crosswalk.sqlReplayed === false &&
    crosswalk.autoSourceSubstitutionAllowed === false &&
    crosswalk.formalAcceptanceGranted === false, 'CROSSWALK_IDENTITY');
  assert(crosswalk.records?.length === 25 &&
    crosswalk.counts?.mappingRows === 25, 'CROSSWALK_COUNT');
  const groups = new Map();
  for (let i = 0; i < nonexact.length; i += 1) {
    const row = nonexact[i];
    const proof = crosswalk.records[i];
    assert(proof?.versionMappingIndependentlyAccepted === false &&
      proof.independentHumanReviewPending === true &&
      proof.authorizationToReplay === false, 'CROSSWALK_REVIEW_REQUIRED');
    const filename = row.canonicalSourcePath.match(/\/(\d{14})_[^/]+\.sql$/);
    const alias = filename ? filename[1] : null;
    const suffix = row.canonicalSourcePath.split('/').at(-1).replace(/^\d{14}_/, '').replace(/\.sql$/, '');
    const expectedPart = PREFIX + 'part-0' + (Math.floor(sourceUnknown.findIndex(x =>
      x.version === row.version) / 8) + 1) + '.json';
    const originalProven = row.sourceByteEqualityConfirmed === true;
    const canonicalConsolidation = JSON.stringify(row.consolidation || null);
    assert(proof.providerLedgerOrder === row.order &&
      proof.providerVersion === row.version && proof.providerName === row.name &&
      proof.providerJoinedSha256 === row.providerJoinedSha256 &&
      proof.canonicalCandidatePath === row.canonicalSourcePath &&
      proof.candidateFileVersion === alias &&
      proof.sourceMappingType === row.mappingType &&
      proof.providerNameMatchesCandidateSuffix === (row.name === suffix) &&
      proof.providerNameContainsCandidateVersionPrefix === Boolean(alias && row.name.startsWith(alias + '_')) &&
      proof.originalSourceByteEqualityClaimed === originalProven &&
      proof.sourceProofStatus === row.sourceByteProof?.status &&
      proof.replayPreserveLedgerOrder === row.order &&
      JSON.stringify(proof.consolidation || null) === canonicalConsolidation &&
      proof.providerAppliedStatementSnapshot === (originalProven ? null : expectedPart) &&
      proof.immutableExistingProofReference === (originalProven ? row.sourceByteProof?.evidence : null) &&
      proof.technicalRecoveryStatus === (originalProven
        ? 'SOURCE_BYTES_VERIFIED_VERSION_BINDING_PENDING'
        : 'APPLIED_SQL_RECOVERED_SOURCE_ORIGINAL_PROVENANCE_PENDING') &&
      proof.proposedReviewerDecision === expectedCrosswalkDisposition(row),
      'CROSSWALK_IDENTITY');
    if (row.consolidation) {
      const group = row.consolidation.groupId;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(row.version);
      assert(row.consolidation.otherVersions?.length === 2, 'CROSSWALK_IDENTITY');
    }
  }
  assert(groups.size === 2 && [...groups.values()].every(values => values.length === 2),
    'CROSSWALK_IDENTITY');

  const c = crosswalk.counts;
  assert(c.sourceBytesAlreadyClaimedVerified === 14 &&
    c.sourceUnknownButAppliedSqlRecovered === 11 &&
    c.types?.canonical_name_match === 21 &&
    c.types?.provider_record_to_canonical_source === 2 &&
    c.types?.superseded_by_forward_reconciliation === 2 &&
    c.consolidationVersions === 4 &&
    c.formalMappingAccepted === 0 && c.SQLReplayed === 0,
    'CROSSWALK_IDENTITY');

  return Object.freeze({
    schema: 'risck-comply.dat01.applied-sql-recovery-validation.v1',
    status: 'PROVIDER_SQL_RECOVERED_REVIEW_REQUIRED',
    providerLedgerRowsFrozen: 137,
    providerAppliedStatementsRecovered: recovered.length,
    totalProviderJoinedUtf8Bytes: totalBytes,
    nonexactMappingsDocumented: nonexact.length,
    nonexactWithExistingSourceByteProof: 14,
    nonexactWithRecoveredProviderSQL: 11,
    consolidationGroups: groups.size,
    totalUniqueReviewCases: uniqueCases.size,
    exactOriginalWholeFilesNewlyProven: 0,
    mappingReviewAcceptances: 0,
    humanReviewerApproval: false,
    postgres17ReplayExecuted: false,
    executableReplayManifestApproved: false,
    rawSqlEmitted: false,
    productionWrites: 0,
    gateA12: 'BLOCKED',
  });
}

function main() {
  const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
  const manifest = read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json');
  const parts = [1,2,3,4,5].map(i => read(PREFIX + 'part-0' + i + '.json'));
  const crosswalk = read(PREFIX + 'nonexact-crosswalk-25.json');
  const result = validateDat01ProviderRecoveryBundle({ manifest, parts, crosswalk });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(error?.message || 'DAT01_RECOVERY_FAILED');
    process.exitCode = 2;
  }
}
