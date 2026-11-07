#!/usr/bin/env node
// DAT-01 decision support: no SQL, database connections, replay or gate acceptance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const HASH = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d{14}$/;
const MANIFEST_PATH = 'docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json';
const HISTORY_PATH = 'docs/enterprise/phase1-v22/DAT01_GITLAB_HISTORICAL_REVISION_MAP_20261104.json';
const SUBSPAN_PATH = 'docs/enterprise/phase1-v22/DAT01_EXACT_PROVIDER_STATEMENT_SUBSPANS_20261104.json';

function demand(condition, reason) {
  if (!condition) throw new Error('DAT01_REVIEW_QUEUE_' + reason);
}

export function buildDat01ReviewQueue({ manifest, history, subspans }) {
  demand(manifest?.schema === 'risck-comply.dat01.ledger-bound-source-provenance-draft.v1', 'MANIFEST_SCHEMA');
  demand(manifest?.state === 'DRAFT_NOT_EXECUTABLE_NOT_APPROVED', 'MANIFEST_MUST_REMAIN_DRAFT');
  demand(SHA.test(manifest.sourceSnapshotSha || ''), 'FROZEN_SOURCE_SHA');
  demand(Array.isArray(manifest.records) && manifest.records.length === 137, 'MANIFEST_137_REQUIRED');
  demand(manifest.invariants?.independentReviewsApproved === 0 &&
    manifest.invariants?.postgres17Replayed === 0 &&
    manifest.invariants?.formalGateA12 === 'BLOCKED', 'UNAPPROVED_SOURCE_REQUIRED');

  const records = manifest.records;
  const versionSet = new Set();
  records.forEach((r, index) => {
    demand(r.order === index + 1 && VERSION.test(r.version || '') &&
      !versionSet.has(r.version), 'ORDER_OR_VERSION_' + (index + 1));
    versionSet.add(r.version);
    demand(HASH.test(r.providerJoinedSha256 || '') &&
      Number.isSafeInteger(r.providerJoinedUtf8Bytes) && r.providerJoinedUtf8Bytes >= 0 &&
      Number.isSafeInteger(r.providerStatementCount) && r.providerStatementCount > 0,
      'PROVIDER_IDENTITY_' + r.version);
    demand(r.approvedForExecutableReplay === false && r.independentReviewer === 'PENDING',
      'ROW_APPROVAL_IN_DRAFT_' + r.version);
    // The frozen ledger cannot describe a source as byte-proven while carrying
    // a NO_PROVEN_WHOLE_SOURCE_BYTES proof. A changed boolean alone is not
    // sufficient: require a recognized status for every claimed proof.
    const verifiedStatuses = new Set([
      'CURRENT_CANONICAL_SOURCE_BYTES_VERIFIED',
      'IMMUTABLE_HISTORICAL_GIT_SOURCE_BYTES_VERIFIED',
      'ALTERNATIVE_SOURCE_FILE_BYTES_VERIFIED_IDENTITY_PENDING',
      'CURRENT_MAPPED_SOURCE_BYTES_VERIFIED_IDENTITY_PENDING',
    ]);
    demand(r.sourceByteEqualityConfirmed === true
      ? verifiedStatuses.has(r.sourceByteProof?.status)
      : r.sourceByteEqualityConfirmed === false &&
        r.sourceByteProof?.status === 'NO_PROVEN_WHOLE_SOURCE_BYTES',
      'SOURCE_PROOF_STATUS_CONTRADICTION_' + r.version);
    demand(r.identityQualified === (r.mappingType === 'exact_version'
      ? 'EXACT_VERSION_METADATA_ONLY' : 'NONEXACT_MAPPING_REVIEW_REQUIRED'),
      'IDENTITY_QUALIFICATION_CONTRADICTION_' + r.version);

    demand(typeof r.canonicalSourcePath === 'string' &&
      /^supabase\/migrations\/[A-Za-z0-9_-]+\.sql$/.test(r.canonicalSourcePath),
      'SOURCE_PATH_' + r.version);
  });

  const unresolved = records.filter(r => r.sourceByteEqualityConfirmed !== true);
  const nonexact = records.filter(r => r.mappingType !== 'exact_version');
  demand(unresolved.length === 34 && nonexact.length === 25, 'FROZEN_COUNTS_DRIFT');
  unresolved.forEach(r => demand(r.sourceByteProof?.status === 'NO_PROVEN_WHOLE_SOURCE_BYTES',
    'UNPROVEN_FLAG_MISMATCH_' + r.version));

  demand(Array.isArray(history?.records) && history.records.length === 34, 'HISTORY_COUNT');
  demand(history.sourceManifest?.gitBlobSha ===
    'a5c0b46c57c134f76da5f22a3f1858b7e1127287', 'FROZEN_MANIFEST_BLOB');
  const historyByVersion = new Map();
  for (const h of history.records) {
    const v = h.productionLedgerVersion;
    demand(!historyByVersion.has(v) && SHA.test(h.latestHistoryCommit || '') &&
      h.sourceByteMatchStatus === 'NOT_YET_PROVEN' &&
      h.identityQualified === false && h.approvedForReplay === false,
      'INVALID_HISTORICAL_CANDIDATE_' + v);
    historyByVersion.set(v, h);
  }
  for (const r of unresolved) {
    const h = historyByVersion.get(r.version);
    demand(h && h.order === r.order && h.canonicalCrosswalkSource === r.canonicalSourcePath,
      'HISTORY_NOT_BOUND_TO_LEDGER_' + r.version);
  }
  demand(historyByVersion.size === unresolved.length, 'HISTORY_NOT_EXHAUSTIVE');

  const direct = Array.isArray(subspans?.records) ? subspans.records : [];
  const fresh = subspans?.newStatementLevelRecovery20261106?.newRecord;
  demand(direct.length === 7 && fresh?.providerStatementExactContiguousSubspan === true,
    'STATEMENT_SUBSPAN_SOURCE_COUNT');
  const subspanByVersion = new Map();
  for (const x of direct) {
    demand(x.exactSourceSubspan?.identicalToLiveProviderStatement === true &&
      x.exactSourceSubspan?.wholeSourceFileEqualsProviderStatement === false &&
      x.identityQualified === 'PENDING' && x.approvedForExecutableReplay === false &&
      HASH.test(x.providerStatementSha256 || ''), 'SUBSPAN_UNSAFE_' + x.version);
    demand(!subspanByVersion.has(x.version), 'SUBSPAN_DUPLICATE_' + x.version);
    subspanByVersion.set(x.version, {
      statementSha256: x.providerStatementSha256,
      immutableGitCommit: x.gitlab?.commit || null,
      classification: 'VERBATIM_STATEMENT_SUBSPAN_ONLY',
    });
  }
  demand(fresh.originalWholeFileEqualsProviderStatement === false &&
    fresh.independentlyQualifiedSourceProvenance === false &&
    fresh.authorizedForReplay === false &&
    HASH.test(fresh.providerStatementSha256 || ''), 'LATEST_SUBSPAN_UNSAFE');
  demand(!subspanByVersion.has(fresh.version), 'LATEST_SUBSPAN_DUPLICATE');
  subspanByVersion.set(fresh.version, {
    statementSha256: fresh.providerStatementSha256,
    immutableGitCommit: fresh.immutableHistoricalCommit,
    classification: 'VERBATIM_STATEMENT_SUBSPAN_WITH_COMMENT_PREFIX_ONLY',
  });
  demand(subspanByVersion.size === 8, 'SUBSPAN_COUNT');
  for (const version of subspanByVersion.keys()) {
    demand(unresolved.some(r => r.version === version), 'SUBSPAN_CANNOT_UPGRADE_PROOF_' + version);
  }

  const renameRecords = history?.historicalRenamedSourceComparison20261106?.records;
  demand(Array.isArray(renameRecords) && renameRecords.length === 2, 'RENAME_SOURCE_COUNT');
  const renames = new Map();
  for (const r of renameRecords) {
    demand(r.wholeSourceEqualsProvider === false &&
      r.providerStatementContiguousInSource === false &&
      SHA.test(r.originCommit || '') && !renames.has(r.productionVersion),
      'RENAME_PROVENANCE_NOT_QUALIFIED_' + r.productionVersion);
    renames.set(r.productionVersion, {
      originalPathCandidate: r.oldHistoricalPath,
      historicalCommit: r.originCommit,
      classification: 'RENAME_FOUND_SQL_SOURCE_NOT_EQUIVALENT',
    });
  }
  const rlsTriage = history?.historicalReconciliationPathTriage20261106;
  demand(rlsTriage?.targetVersion === '20260726070000' &&
    rlsTriage.authorizedForReplay === false &&
    rlsTriage.independentReviewerApproval === false,
    'RLS_RECONCILIATION_DISPOSITION');

  const consolidationMap = new Map();
  for (const r of records) {
    if (!r.consolidation) continue;
    const { groupId, otherVersions } = r.consolidation;
    demand(/^CONSOLIDATION_[12]$/.test(groupId) &&
      Array.isArray(otherVersions) && otherVersions.includes(r.version),
      'CONSOLIDATION_LINK_' + r.version);
    if (!consolidationMap.has(groupId)) consolidationMap.set(groupId, []);
    consolidationMap.get(groupId).push(r.version);
  }
  demand(consolidationMap.size === 2, 'CONSOLIDATION_GROUP_COUNT');
  for (const [group, versions] of consolidationMap) {
    demand(versions.length === 2 && new Set(versions).size === 2, 'CONSOLIDATION_COLLISION_' + group);
  }

  const queue = records
    .filter(r => r.sourceByteEqualityConfirmed !== true || r.mappingType !== 'exact_version')
    .map(r => {
      const needsWholeSource = r.sourceByteEqualityConfirmed !== true;
      const needsVersionIdentity = r.mappingType !== 'exact_version';
      const isHistoricalRlsDrift = r.version === rlsTriage.targetVersion;
      const groupId = r.consolidation?.groupId || null;
      const sourceHistory = historyByVersion.get(r.version) || null;
      const evidenceSubspan = subspanByVersion.get(r.version) || null;
      const rename = renames.get(r.version) || null;
      return {
        order: r.order,
        providerVersion: r.version,
        providerMigrationName: r.name,
        providerStatementCount: r.providerStatementCount,
        providerJoinedUtf8Bytes: r.providerJoinedUtf8Bytes,
        providerJoinedSha256: r.providerJoinedSha256,
        mappedSourcePath: r.canonicalSourcePath,
        mappedSourceBlobSha1: r.canonicalSourceGitBlobSha || null,
        mappingType: r.mappingType,
        sourceByteClaimStatus: r.sourceByteProof.status,
        sourceByteEqualityClaimed: r.sourceByteEqualityConfirmed === true,
        reviewClass: needsWholeSource && needsVersionIdentity
          ? 'ORIGINAL_SOURCE_AND_VERSION_IDENTITY_REVIEW'
          : needsWholeSource ? 'ORIGINAL_SOURCE_BYTES_REVIEW' : 'VERSION_IDENTITY_REVIEW',
        historicalCandidate: sourceHistory ? {
          lastCommit: sourceHistory.latestHistoryCommit,
          commitCount: sourceHistory.historicalCommitCount,
          interpretation: 'HISTORY_CANDIDATE_NOT_WHOLE_FILE_PROOF',
        } : null,
        verbatimStatementEvidence: evidenceSubspan,
        historicalRenameEvidence: rename,
        consolidation: groupId ? {
          groupId,
          preserveSeparateVersions: [...consolidationMap.get(groupId)],
          collapsePermitted: false,
        } : null,
        historicalRlsPolicyDrift: isHistoricalRlsDrift
          ? 'APPLIED_USING_TRUE_DIFFERS_FROM_LATER_AUTH_UID_POLICY; NO_AUTO_SUBSTITUTION' : null,
        proposedDisposition: needsWholeSource
          ? 'RECOVER_APPLIED_ORIGINAL_WHOLE_FILE_BYTES_OR_REQUEST_QUALIFIED_EXCEPTION'
          : 'INDEPENDENTLY_VALIDATE_NONEXACT_SOURCE_IDENTITY_AND_ORDER',
        requiredIndependentDecisions: [
          ...(needsWholeSource ? ['SOURCE_BYTES_OR_EXCEPTION'] : []),
          ...(needsVersionIdentity ? ['PROVIDER_VERSION_TO_SOURCE_MAPPING'] : []),
          ...(groupId ? ['PRESERVE_DISTINCT_CONSOLIDATED_VERSION_ORDER'] : []),
          ...(isHistoricalRlsDrift ? ['RLS_HISTORICAL_POLICY_SEMANTICS'] : []),
          'ORDERED_PG17_QA_REPLAY_AND_SECURITY_REVIEW',
        ],
        independentReviewApproved: false,
        executableReplayAuthorized: false,
      };
    });
  const overlap = queue.filter(r => r.reviewClass === 'ORIGINAL_SOURCE_AND_VERSION_IDENTITY_REVIEW').length;
  demand(queue.length === 48 && overlap === 11 && new Set(queue.map(r => r.providerVersion)).size === 48,
    'DE_DUPLICATED_REVIEW_QUEUE_COUNT');
  demand(queue.filter(r => r.historicalCandidate).length === 34 &&
    queue.filter(r => r.verbatimStatementEvidence).length === 8, 'REVIEW_EVIDENCE_BOUNDARY');

  return {
    schema: 'risck-comply.dat01.review-decision-queue.v1',
    input: {
      frozenManifest: MANIFEST_PATH,
      historicalCandidates: HISTORY_PATH,
      statementSubspans: SUBSPAN_PATH,
      originalSourceSnapshotSha: manifest.sourceSnapshotSha,
    },
    status: 'INDEPENDENT_REVIEW_REQUIRED_NO_SQL_EXECUTION',
    counts: {
      providerLedgerRows: records.length,
      missingWholeFileSourceProof: unresolved.length,
      nonexactVersionMappings: nonexact.length,
      overlappingIssues: overlap,
      uniqueReviewCases: queue.length,
      statementSubspansNotWholeFiles: subspanByVersion.size,
      historicalRenameCasesNotProven: renames.size,
      consolidationGroups: consolidationMap.size,
      independentlyApprovedReplayRows: 0,
    },
    safety: {
      sourceSqlIncluded: false,
      databaseAccess: false,
      productionWrites: 0,
      sqlReplayExecuted: false,
      executableManifestProduced: false,
      independentHumanApproval: false,
      gateA12: 'BLOCKED',
      formalEnterpriseGateAccepted: false,
    },
    decisions: queue,
  };
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  try {
    const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
    const output = buildDat01ReviewQueue({
      manifest: read(MANIFEST_PATH),
      history: read(HISTORY_PATH),
      subspans: read(SUBSPAN_PATH),
    });
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (error) {
    console.error(error?.message || 'DAT01_REVIEW_QUEUE_FAILED');
    process.exitCode = 2;
  }
}
