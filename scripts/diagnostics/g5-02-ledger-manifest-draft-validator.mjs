#!/usr/bin/env node
// Source-only DAT-01 manifest consistency gate. Never executes SQL or grants acceptance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const STATUS = Object.freeze({
  CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED: 'exact',
  IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED: 'exact',
  CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING: 'nonexact',
  ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING: 'nonexact',
  NO_PROVEN_WHOLE_SOURCE_BYTES: 'either',
});
const EXPECTED = Object.freeze({
  CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED: 87,
  IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED: 2,
  CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING: 13,
  ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING: 1,
  NO_PROVEN_WHOLE_SOURCE_BYTES: 34,
});
function requireInvariant(ok, code) { if (!ok) throw Error(`DAT01_MANIFEST_${code}`); }

export function validateDraftManifest(manifest, crosswalk, ledger) {
  requireInvariant(manifest?.schema === 'risck-comply.dat01.ledger-bound-source-provenance-draft.v1', 'SCHEMA');
  requireInvariant(manifest?.state === 'DRAFT_NOT_EXECUTABLE_NOT_APPROVED', 'STATE');
  const records = manifest.records, entries = crosswalk?.entries, provider = ledger?.rows;
  requireInvariant(Array.isArray(records) && records.length === 137, 'RECORD_COUNT');
  requireInvariant(Array.isArray(entries) && entries.length === 137, 'CROSSWALK_COUNT');
  requireInvariant(Array.isArray(provider) && provider.length === 137, 'PROVIDER_COUNT');
  requireInvariant(Array.isArray(crosswalk?.consolidated_sources) && crosswalk.consolidated_sources.length === 2, 'CONSOLIDATION_COUNT');
  const providerByVersion = new Map(provider.map(p => [p.version, p]));
  requireInvariant(providerByVersion.size === 137, 'PROVIDER_DUPLICATE');
  const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, 0]));
  const versions = new Set();
  let exact = 0, nonexact = 0, byteProven = 0;
  const groups = new Map();
  crosswalk.consolidated_sources.forEach((g, i) => {
    requireInvariant(g.production_versions?.length === 2, 'CONSOLIDATION_PAIR');
    for (const v of g.production_versions) {
      requireInvariant(!groups.has(v), 'CONSOLIDATION_OVERLAP');
      groups.set(v, { groupId: `CONSOLIDATION_${i+1}`, canonicalSource: g.source, otherVersions: g.production_versions });
    }
  });
  for (let i = 0; i < 137; i++) {
    const r = records[i], e = entries[i], p = providerByVersion.get(r?.version);
    requireInvariant(r?.order === i + 1 && e?.order === i + 1, `ORDER_${i+1}`);
    requireInvariant(/^\d{14}$/.test(r.version) && !versions.has(r.version), `VERSION_${i+1}`);
    versions.add(r.version);
    requireInvariant(r.version === e.production_version && r.name === e.production_name && p?.name === r.name, `IDENTITY_${i+1}`);
    requireInvariant(r.mappingType === e.mapping && r.canonicalSourcePath === e.source, `SOURCE_MAPPING_${i+1}`);
    requireInvariant(/^supabase\/migrations\/[\w-]+\.sql$/.test(r.canonicalSourcePath), `SOURCE_PATH_${i+1}`);
    requireInvariant(p.statement_count === r.providerStatementCount && p.joined_bytes === r.providerJoinedUtf8Bytes && p.joined_statement_sha256 === r.providerJoinedSha256 && /^[a-f0-9]{64}$/.test(r.providerJoinedSha256), `PROVIDER_HASH_${i+1}`);
    requireInvariant(r.approvedForExecutableReplay === false && r.independentReviewer === 'PENDING', `PREMATURE_APPROVAL_${i+1}`);
    const type = r.mappingType === 'exact_version' ? 'exact' : 'nonexact';
    if (type === 'exact') {
      exact++;
      requireInvariant(r.identityQualified === 'EXACT_VERSION_METADATA_ONLY', `EXACT_IDENTITY_${i+1}`);
    } else {
      nonexact++;
      requireInvariant(r.identityQualified === 'NONEXACT_MAPPING_REVIEW_REQUIRED', `NONEXACT_REVIEW_${i+1}`);
    }
    const group = groups.get(r.version);
    requireInvariant(JSON.stringify(r.consolidation) === JSON.stringify(group ?? null), `CONSOLIDATION_${i+1}`);
    const s = r.sourceByteProof?.status;
    requireInvariant(Object.hasOwn(STATUS, s) && (STATUS[s] === type || STATUS[s] === 'either'), `EVIDENCE_CLASS_${i+1}`);
    const proven = s !== 'NO_PROVEN_WHOLE_SOURCE_BYTES';
    requireInvariant(r.sourceByteEqualityConfirmed === proven, `BYTE_PROOF_FLAG_${i+1}`);
    if (proven) byteProven++;
    if (r.sourceByteProof.replacementSource) {
      const alt = r.sourceByteProof.replacementSource;
      requireInvariant(/^supabase\/migrations\/[\w-]+\.sql$/.test(alt.path) && /^[a-f0-9]{40}$/.test(alt.gitBlobSha), `ALTERNATIVE_SOURCE_${i+1}`);
      requireInvariant(s === 'IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED' || s === 'ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING', `ALTERNATIVE_STATUS_${i+1}`);
    }
    counts[s]++;
  }
  requireInvariant(exact === 112 && nonexact === 25 && byteProven === 103, 'AGGREGATE_COUNTS');
  for (const [status, num] of Object.entries(EXPECTED)) requireInvariant(counts[status] === num, `CLASS_COUNT_${status}`);
  const inv = manifest.invariants;
  requireInvariant(inv?.ledgerRows === 137 && inv?.uniqueVersions === 137 && inv?.nonexactIdentitiesPendingReview === 25 && inv?.sourceByteProvenanceEntries === 103 && inv?.sourceByteUnresolvedEntries === 34 && inv?.independentReviewsApproved === 0 && inv?.postgres17Replayed === 0 && inv?.formalGateA12 === 'BLOCKED', 'DECLARED_INVARIANTS');
  return { status: 'DRAFT_SCHEMA_CONSISTENT_NOT_ACCEPTED', total: 137, byteProven: 103, byteUnresolved: 34, nonexactIdentityReviewsPending: 25, executableRows: 0, postgres17Replayed: 0, acceptance: 'NOT_GRANTED' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = resolve(process.cwd());
  const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  try {
    const result = validateDraftManifest(
      read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json'),
      read('supabase/reconciliation/20261022_production_migration_source_crosswalk.json'),
      read('docs/enterprise/closure-v20/DAT01_PROD_LEDGER_READONLY_HASHES_20261103.json')
    );
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (e) {
    process.stderr.write(String(e.message) + '\n');
    process.exitCode = 1;
  }
}
