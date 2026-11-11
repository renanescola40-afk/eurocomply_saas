#!/usr/bin/env node
// Read-only DAT-01 case-level technical triage. Regex signals are review prompts,
// NOT proven vulnerabilities or approvals; no SQL is included in the output.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const PREFIX = 'docs/enterprise/phase1-v22/recovered-provider-statements/';

function riskSignals(statements) {
  if (!statements) return ['APPLIED_SQL_NOT_IN_THIS_RECOVERY_BUNDLE'];
  const sql = statements.join('\n');
  const has = re => re.test(sql);
  const flags = [];
  if (has(/\bSECURITY\s+DEFINER\b/i)) flags.push('SECURITY_DEFINER_PRESENT');
  if (has(/\b(?:CREATE|ALTER|DROP)\s+POLICY\b/i)) flags.push('RLS_POLICY_DDL_PRESENT');
  if (has(/\b(?:CREATE|ALTER)\s+POLICY\b[\s\S]{0,2000}?\bUSING\s*\(\s*true\s*\)/i))
    flags.push('POSSIBLE_BROAD_POLICY_USING_TRUE_REVIEW');
  if (has(/\b(?:GRANT|REVOKE)\b[\s\S]{0,60}?(?:\bON\b|\bTO\b|\bFROM\b)/i)) flags.push('ACL_CHANGE_PRESENT');
  if (has(/\bDROP\s+(?:TABLE|SCHEMA|FUNCTION|POLICY|TRIGGER|VIEW|INDEX)\b/i)) flags.push('DROP_DDL_PRESENT');
  if (has(/\b(?:UPDATE|DELETE\s+FROM|TRUNCATE)\b/i)) flags.push('DML_CHANGE_PRESENT');
  if (has(/\bSECURITY\s+DEFINER\b/i) && !has(/\bSET\s+search_path\b/i))
    flags.push('NO_SEARCH_PATH_SEEN_IN_BATCH_REVIEW_FUNCTION_SCOPE');
  return flags;
}

export function buildDat01CaseTriage({ manifest, queue, crosswalk, parts }) {
  if (manifest?.records?.length !== 137 ||
      queue?.decisions?.length !== 48 || crosswalk?.records?.length !== 25 ||
      parts?.length !== 5 ||
      manifest.invariants?.formalGateA12 !== 'BLOCKED')
    throw new Error('DAT01_CASE_TRIAGE_FROZEN_INPUT_MISMATCH');
  const needsSource = manifest.records.filter(x => x.sourceByteEqualityConfirmed === false);
  const needsMapping = manifest.records.filter(x => x.mappingType !== 'exact_version');
  const ids = new Set([...needsSource, ...needsMapping].map(x => x.version));
  if (needsSource.length !== 34 || needsMapping.length !== 25 || ids.size !== 48)
    throw new Error('DAT01_CASE_TRIAGE_FROZEN_COUNTS_MISMATCH');
  const stored = parts.flatMap(x => x.records || []);
  const applied = new Map(stored.map(x => [x.providerVersion, x]));
  const maps = new Map(crosswalk.records.map(x => [x.providerVersion, x]));
  if (stored.length !== 34 || applied.size !== 34 || maps.size !== 25)
    throw new Error('DAT01_CASE_TRIAGE_PROVIDER_COVERAGE');
  const queueIds = new Set();
  const cases = queue.decisions.map((decision, i) => {
    const ledger = manifest.records.find(x => x.version === decision.providerVersion);
    if (!ledger || queueIds.has(decision.providerVersion) ||
        !ids.has(decision.providerVersion) || decision.order !== ledger.order ||
        decision.providerMigrationName !== ledger.name ||
        decision.mappedSourcePath !== ledger.canonicalSourcePath ||
        decision.providerJoinedSha256 !== ledger.providerJoinedSha256 ||
        decision.sourceByteEqualityClaimed !== ledger.sourceByteEqualityConfirmed ||
        decision.mappingType !== ledger.mappingType ||
        decision.independentReviewApproved !== false ||
        decision.executableReplayAuthorized !== false)
      throw new Error('DAT01_CASE_TRIAGE_QUEUE_IDENTITY_MISMATCH');
    queueIds.add(decision.providerVersion);
    const missing = ledger.sourceByteEqualityConfirmed === false;
    const nonexact = ledger.mappingType !== 'exact_version';
    const recovered = applied.get(ledger.version);
    const cross = maps.get(ledger.version);
    if ((missing && (!recovered ||
      recovered.providerJoinedSha256 !== ledger.providerJoinedSha256 ||
      recovered.originalWholeFileProven !== false ||
      recovered.executableReplayAuthorized !== false)) ||
      (!missing && Boolean(recovered)) ||
      (nonexact && (!cross || cross.providerJoinedSha256 !== ledger.providerJoinedSha256 ||
        cross.versionMappingIndependentlyAccepted !== false ||
        cross.authorizationToReplay !== false)) ||
      (!nonexact && Boolean(cross)))
      throw new Error('DAT01_CASE_TRIAGE_SOURCE_OR_MAPPING_DRIFT');
    const flags = riskSignals(missing ? recovered.statements : null);
    if (nonexact && cross.consolidation) flags.push('CONSOLIDATION_VERSION_DISTINCTION_REQUIRED');
    if (decision.historicalRlsPolicyDrift) flags.push('HISTORICAL_RLS_DRIFT_REVIEW_REQUIRED');
    const priority = flags.includes('POSSIBLE_BROAD_POLICY_USING_TRUE_REVIEW') ||
      flags.includes('HISTORICAL_RLS_DRIFT_REVIEW_REQUIRED')
      ? 'P0_POLICY_SEMANTICS_REVIEW'
      : flags.includes('SECURITY_DEFINER_PRESENT') ||
        flags.includes('RLS_POLICY_DDL_PRESENT') ||
        flags.includes('CONSOLIDATION_VERSION_DISTINCTION_REQUIRED')
        ? 'P1_SECURITY_AND_PROVENANCE_REVIEW' : 'P2_SOURCE_PROVENANCE_REVIEW';
    return {
      caseId: 'DAT01-' + String(ledger.order).padStart(3, '0'),
      providerLedgerOrder: ledger.order,
      providerVersion: ledger.version,
      providerName: ledger.name,
      appliedSqlSha256: ledger.providerJoinedSha256,
      mappedSourcePath: ledger.canonicalSourcePath,
      caseTypes: [ ...(missing ? ['UNPROVEN_ORIGINAL_WHOLE_SOURCE'] : []),
        ...(nonexact ? ['NONEXACT_VERSION_MAPPING'] : []) ],
      sourceProofStatus: ledger.sourceByteProof?.status || null,
      recoveredAppliedSqlPresent: missing,
      historicalCandidateCommit: decision.historicalCandidate?.lastCommit || null,
      immutableSourceEvidence: ledger.sourceByteProof?.evidence || null,
      consolidationGroup: cross?.consolidation?.groupId || null,
      riskSignals: flags,
      priority,
      requiredIndependentDecisions: decision.requiredIndependentDecisions,
      humanReview: {
        sourceProvenanceDisposition: missing ? 'PENDING' : 'EXISTING_BYTE_PROOF_RECHECK_PENDING',
        versionMappingDisposition: nonexact ? 'PENDING' : 'NOT_APPLICABLE',
        securitySemanticsDisposition: 'PENDING',
        reviewerIdentity: null,
        reviewerEvidenceReference: null,
        reviewerRationale: null,
        independentlyAccepted: false
      },
      replayAuthorized: false
    };
  });
  if (queueIds.size !== 48 ||
      cases.some((x,i) => i > 0 && x.providerLedgerOrder <= cases[i-1].providerLedgerOrder))
    throw new Error('DAT01_CASE_TRIAGE_ORDER_OR_COVERAGE');
  const priorities = ['P0_POLICY_SEMANTICS_REVIEW','P1_SECURITY_AND_PROVENANCE_REVIEW','P2_SOURCE_PROVENANCE_REVIEW'];
  return {
    schema:'risck-comply.dat01.48-case-technical-triage.v1',
    sourceSnapshotSha: manifest.sourceSnapshotSha,
    classification:'TECHNICAL_REVIEW_TRIAGE_NOT_A_HUMAN_DECISION',
    scope:'SOURCE_ONLY_NON_EXECUTABLE',
    signalNotice:'Static regex indicators do not establish a vulnerability, policy intent, or function-scoped security property.',
    counts:{
      frozenLedger:137,
      uniqueCaseReviews:cases.length,
      originalSourceReviews:needsSource.length,
      nonexactVersionReviews:needsMapping.length,
      overlap:34+25-cases.length,
      recoveredAppliedSqlRecords:stored.length,
      qualifiedHumanDecisions:0,
      authorizationToReplay:0,
      priorities:Object.fromEntries(priorities.map(p=>[p,cases.filter(x=>x.priority===p).length]))
    },
    productionWrites:0,
    sqlReplayExecuted:false,
    fullOriginalFileProvenanceNewlyApproved:0,
    formalGateA12:'BLOCKED',
    cases
  };
}

function main() {
  const read = p => JSON.parse(readFileSync(new URL('../../' + p, import.meta.url), 'utf8'));
  const manifest = read('docs/enterprise/closure-v21/DAT01_137_LEDGER_BOUND_PROVENANCE_DRAFT_20261104.json');
  const queue = read('docs/enterprise/phase1-v22/DAT01_PROVENANCE_REVIEW_DECISIONS_20261106.json');
  const crosswalk = read(PREFIX + 'nonexact-crosswalk-25.json');
  const parts = [1,2,3,4,5].map(n=>read(PREFIX+'part-0'+n+'.json'));
  process.stdout.write(JSON.stringify(buildDat01CaseTriage({manifest,queue,crosswalk,parts}),null,2)+'\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try{main()}catch(error){ console.error(error.message); process.exitCode=2 }
}
