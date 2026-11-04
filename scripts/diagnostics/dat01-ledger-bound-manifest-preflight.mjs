#!/usr/bin/env node
// Metadata integrity only. NEVER interprets/executes SQL, authorizes replay, or accepts a G1 gate.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HASH = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;
const VERIFIED_STATUSES = new Set([
  'CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED',
  'IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED',
  'CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING',
  'ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING',
]);
const UNRESOLVED_STATUS = 'NO_PROVEN_WHOLE_SOURCE_BYTES';
const SQL_PATH = /^supabase\/migrations\/[A-Za-z0-9_-]+\.sql$/;
const SAFE_EVIDENCE = /^docs\/enterprise\/[A-Za-z0-9_./-]+\.json$/;

export function validateDat01LedgerBoundManifest({ manifest, frozenLedger, crosswalk, expected = 137 }) {
  const errors = [];
  const fail = (code, order = null) => errors.push({ code, ...(order == null ? {} : { order }) });
  const records = Array.isArray(manifest?.records) ? manifest.records : [];
  const frozen = Array.isArray(frozenLedger?.rows) ? frozenLedger.rows : [];
  const mapped = Array.isArray(crosswalk?.entries) ? crosswalk.entries : [];
  if (manifest?.schema !== 'risck-comply.dat01.ledger-bound-source-provenance-draft.v1') fail('SCHEMA_UNEXPECTED');
  if (manifest?.state !== 'DRAFT_NOT_EXECUTABLE_NOT_APPROVED') fail('DRAFT_STATE_UNEXPECTED');
  if (!SHA.test(manifest?.sourceSnapshotSha ?? '')) fail('SOURCE_SNAPSHOT_SHA_INVALID');
  if (records.length !== expected || frozen.length !== expected || mapped.length !== expected) fail('DENOMINATOR_MISMATCH');
  if (frozenLedger?.ledger_versions !== expected || frozenLedger?.distinct_versions !== expected) fail('FROZEN_LEDGER_COUNT_MISMATCH');
  if (crosswalk?.summary?.production_migration_identities !== expected || crosswalk?.summary?.mapped !== expected) fail('CROSSWALK_COUNT_MISMATCH');
  const allVersions = new Set();
  const sources = new Map();
  let byteProven = 0, unresolved = 0, exact = 0, nonexact = 0, independentReviews = 0, replayApprovals = 0;
  const proofCategories = {};

  for (let i = 0; i < Math.max(records.length, frozen.length, mapped.length); i++) {
    const r = records[i], f = frozen[i], c = mapped[i], order = i + 1;
    if (!r || !f || !c) { fail('ROW_MISSING', order); continue; }
    if (r.order !== order || c.order !== order || !/^\d{14}$/.test(r.version ?? '') ||
        r.version !== f.version || r.version !== c.production_version || r.name !== f.name || r.name !== c.production_name) fail('ORDER_OR_IDENTITY_MISMATCH', order);
    if (allVersions.has(r.version)) fail('DUPLICATE_LEDGER_VERSION', order);
    allVersions.add(r.version);
    if (!HASH.test(r.providerJoinedSha256 ?? '') || r.providerJoinedSha256 !== f.joined_statement_sha256 ||
        r.providerJoinedUtf8Bytes !== f.joined_bytes || r.providerStatementCount !== f.statement_count) fail('PROVIDER_DIGEST_OR_SIZE_MISMATCH', order);
    if (r.mappingType !== c.mapping || r.canonicalSourcePath !== c.source || !SQL_PATH.test(r.canonicalSourcePath ?? '')) fail('CROSSWALK_SOURCE_MISMATCH', order);
    if (r.mappingType === 'exact_version') exact++; else nonexact++;
    if (!sources.has(r.canonicalSourcePath)) sources.set(r.canonicalSourcePath, []);
    sources.get(r.canonicalSourcePath).push(r.version);

    const proof = r.sourceByteProof;
    const status = proof?.status ?? null;
    proofCategories[status ?? 'MISSING'] = (proofCategories[status ?? 'MISSING'] ?? 0) + 1;
    const isProven = VERIFIED_STATUSES.has(status);
    if (!isProven && status !== UNRESOLVED_STATUS) fail('UNKNOWN_SOURCE_PROOF_STATUS', order);
    if (r.sourceByteEqualityConfirmed !== isProven) fail('SOURCE_PROOF_FLAG_MISMATCH', order);
    if (isProven) {
      byteProven++;
      if (!SAFE_EVIDENCE.test(proof?.evidence ?? '') || proof.evidence.includes('..')) fail('EVIDENCE_PATH_UNSAFE', order);
    } else unresolved++;
    if (r.independentReviewer !== 'PENDING') independentReviews++;
    if (r.approvedForExecutableReplay === true) replayApprovals++;
    if (r.approvedForExecutableReplay !== false) fail('EXECUTABLE_APPROVAL_IN_DRAFT', order);
    if (r.independentReviewer !== 'PENDING') fail('REVIEW_IN_DRAFT', order);
  }

  const actualGroups = [...sources.entries()].filter(([, ids]) => ids.length > 1)
    .map(([source, ids]) => JSON.stringify([source, [...ids].sort()])).sort();
  const declaredGroups = (Array.isArray(crosswalk?.consolidated_sources) ? crosswalk.consolidated_sources : [])
    .map(g => JSON.stringify([g.source, [...(g.production_versions ?? [])].sort()])).sort();
  if (JSON.stringify(actualGroups) !== JSON.stringify(declaredGroups)) fail('CONSOLIDATION_MISMATCH');
  if (sources.size !== crosswalk?.summary?.unique_source_files) fail('UNIQUE_SOURCE_COUNT_MISMATCH');
  const inv = manifest?.invariants ?? {};
  const expectedInvariants = {
    ledgerRows: expected, crosswalkRows: expected, uniqueVersions: allVersions.size,
    canonicalExactIdentityMetadata: exact, nonexactIdentitiesPendingReview: nonexact,
    sourceByteProvenanceEntries: byteProven, sourceByteUnresolvedEntries: unresolved,
    consolidationGroups: actualGroups.length, independentReviewsApproved: 0, postgres17Replayed: 0,
  };
  for (const [key, value] of Object.entries(expectedInvariants)) if (inv[key] !== value) fail('INVARIANT_MISMATCH_' + key);
  if (inv.formalGateA12 !== 'BLOCKED') fail('FORMAL_GATE_NOT_BLOCKED');
  if (allVersions.size !== expected || byteProven + unresolved !== expected) fail('RECORD_COVERAGE_MISMATCH');
  return {
    schema: 'risck-comply.dat01.ledger-bound-manifest-structural-preflight.v1',
    status: errors.length ? 'INCONSISTENT_BLOCKED' : 'STRUCTURALLY_CONSISTENT_BLOCKED',
    sourceSnapshotSha: manifest?.sourceSnapshotSha ?? null,
    expected, inspected: records.length, uniqueLedgerVersions: allVersions.size,
    sourceFiles: sources.size, consolidationGroups: actualGroups.length,
    exactVersionMappings: exact, nonexactIdentityMappings: nonexact,
    sourceByteProofClaims: byteProven, unresolvedSourceByteClaims: unresolved,
    proofCategories, independentReviews, replayApprovals,
    errors, sqlByteEqualityIndependentlyRecomputed: false,
    sourceFilesRevalidatedAgainstLiveProvider: false,
    isolatedPostgresReplayPerformed: false, replayAuthorized: false,
    formalAcceptanceGranted: false,
    note: 'This checks archived manifest/crosswalk/ledger metadata and fail-closed status only. Claimed source matches require independent live/hash verification; no SQL is run or replay authorized.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const read = path => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
    const result = validateDat01LedgerBoundManifest({
      manifest: read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
      frozenLedger: read('docs/enterprise/closure-v20/DAT01_PROD_LEDGER_READONLY_HASHES_20261103.json'),
      crosswalk: read('supabase/reconciliation/20261022_production_migration_source_crosswalk.json'),
    });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.errors.length || process.argv.includes('--require-replay-authorization')) process.exitCode = 2;
  } catch (error) {
    process.stderr.write('DAT-01 structural preflight FAILED: ' + String(error) + '\n');
    process.exitCode = 2;
  }
}
