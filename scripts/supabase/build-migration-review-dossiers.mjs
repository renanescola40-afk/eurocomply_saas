#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function evidenceItemsFor(evidence) {
  if (!Array.isArray(evidence?.items) || evidence.items.length === 0) {
    throw new Error('object evidence items must be a non-empty array');
  }
  return evidence.items;
}

export function buildDossiers({ inventory, inventoryBytes, evidence, evidenceBytes, releaseSha }) {
  if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') {
    throw new Error('unsupported inventory schema');
  }
  if (evidence?.schema !== 'risck-comply.supabase-migration-object-evidence.v1') {
    throw new Error('unsupported evidence schema');
  }
  if (!/^[a-f0-9]{40}$/i.test(String(releaseSha ?? ''))) {
    throw new Error('release SHA must be a full 40-character Git SHA');
  }

  const normalizedReleaseSha = String(releaseSha).toLowerCase();
  if (evidence?.source?.targetSha && String(evidence.source.targetSha).toLowerCase() !== normalizedReleaseSha) {
    throw new Error('object evidence release SHA mismatch');
  }

  const evidenceItems = evidenceItemsFor(evidence);
  const evidenceByFile = new Map();
  for (const item of evidenceItems) {
    if (!item?.filename) throw new Error('object evidence item is missing filename');
    if (evidenceByFile.has(item.filename)) throw new Error(`duplicate object evidence: ${item.filename}`);
    evidenceByFile.set(item.filename, item);
  }

  const dossiers = inventory.items.map((item) => {
    const observed = evidenceByFile.get(item.filename);
    if (!observed) throw new Error(`missing object evidence: ${item.filename}`);
    if (observed.sha256 !== item.sha256) throw new Error(`evidence digest mismatch: ${item.filename}`);

    const operations = Array.isArray(observed.operations) ? observed.operations : [];
    const unresolved = Array.isArray(observed.unresolved) ? observed.unresolved : [];
    const candidate = observed.candidate;
    if (!candidate || typeof candidate !== 'object') {
      throw new Error(`missing candidate evidence: ${item.filename}`);
    }

    const matchedOperations = operations.filter((operation) => operation.targetStateMatched === true);
    const unmatchedOperations = operations.filter((operation) => operation.targetStateMatched !== true);
    const presentOperations = operations.filter((operation) => operation.observedState === 'PRESENT');
    const absentOperations = operations.filter((operation) => operation.observedState === 'ABSENT');
    const allTargetStatesMatched = operations.length > 0 && unmatchedOperations.length === 0;
    const allExtractedObjectsPresent = operations.length > 0
      && operations.every((operation) => operation.observedState === 'PRESENT');

    return {
      filename: item.filename,
      version: item.version,
      sqlSha256: item.sha256,
      classificationReasons: item.classificationReasons,
      duplicateVersion: observed.duplicateVersion === true,
      objectProofDigest: observed.objectProofDigest ?? null,
      extractedObjectCount: operations.length,
      presentObjectCount: presentOperations.length,
      missingObjectCount: absentOperations.length,
      allExtractedObjectsPresent,
      targetStateMatchedCount: matchedOperations.length,
      targetStateUnmatchedCount: unmatchedOperations.length,
      allTargetStatesMatched,
      unresolvedStatementCount: unresolved.length,
      operations,
      unresolved,
      candidate: {
        objectState: candidate.objectState ?? 'UNPROVABLE',
        classification: candidate.candidateClassification ?? 'REQUIRES_SPLIT_REVIEW',
        confidence: candidate.confidence ?? 'LOW',
        rationale: candidate.rationale ?? null,
        humanDecisionRequired: candidate.humanDecisionRequired !== false,
        automaticClassificationAllowed: candidate.automaticClassificationAllowed === true,
      },
      evidenceAssessment: {
        supportsAlreadyPresentReview: candidate.candidateClassification === 'ALREADY_PRESENT_IN_SCHEMA',
        supportsPendingDeploymentReview: candidate.candidateClassification === 'PENDING_DEPLOYMENT',
        supportsSplitReview: candidate.candidateClassification === 'REQUIRES_SPLIT_REVIEW',
        provesMigrationApplied: false,
        candidateEvidenceIsApproval: false,
        unresolvedSemanticsRemain: unresolved.length > 0,
      },
      reviewerDecision: {
        classification: null,
        rationale: null,
        schemaEvidenceReference: null,
        stagedExecutionEvidenceReference: null,
        replacementMigrationDigest: null,
        archivalMappingReference: null,
        rollbackReference: null,
        reviewer: null,
        reviewerRole: null,
        reviewedAt: null,
      },
      automaticClassification: null,
      reviewRequired: true,
    };
  });

  if (dossiers.length !== evidenceItems.length) {
    throw new Error(`inventory/object evidence item count mismatch: ${dossiers.length} != ${evidenceItems.length}`);
  }

  return {
    schema: 'risck-comply.supabase-migration-review-dossiers.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    releaseSha: normalizedReleaseSha,
    inventorySha256: sha256(inventoryBytes),
    objectEvidenceSha256: sha256(evidenceBytes),
    generatedAt: new Date().toISOString(),
    counts: {
      total: dossiers.length,
      allObjectsPresent: dossiers.filter((item) => item.allExtractedObjectsPresent).length,
      objectsMissing: dossiers.filter((item) => item.missingObjectCount > 0).length,
      noObjectsExtracted: dossiers.filter((item) => item.extractedObjectCount === 0).length,
      allTargetStatesMatched: dossiers.filter((item) => item.allTargetStatesMatched).length,
      targetStateMismatch: dossiers.filter((item) => item.targetStateUnmatchedCount > 0).length,
      unprovable: dossiers.filter((item) => item.candidate.objectState === 'UNPROVABLE').length,
      candidateAlreadyPresent: dossiers.filter((item) => item.candidate.classification === 'ALREADY_PRESENT_IN_SCHEMA').length,
      candidatePendingDeployment: dossiers.filter((item) => item.candidate.classification === 'PENDING_DEPLOYMENT').length,
      candidateSplitReview: dossiers.filter((item) => item.candidate.classification === 'REQUIRES_SPLIT_REVIEW').length,
      acceptedDecisions: 0,
    },
    dossiers,
    nonCreditingNotice: 'These dossiers organize exact-SHA object and statement evidence for human review only. Candidate classifications are not approvals. They do not classify migrations automatically, repair history, authorize dry-run, or authorize production writes.',
  };
}

async function main() {
  const [inventoryPath, evidencePath, outputDir = 'artifacts/supabase-migration-review-dossiers'] = process.argv.slice(2);
  const releaseSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  if (!inventoryPath || !evidencePath) throw new Error('usage: inventory.json migration-object-evidence.json [output-dir]');
  const inventoryBytes = await readFile(inventoryPath);
  const evidenceBytes = await readFile(evidencePath);
  const report = buildDossiers({
    inventory: JSON.parse(inventoryBytes),
    inventoryBytes,
    evidence: JSON.parse(evidenceBytes),
    evidenceBytes,
    releaseSha,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'migration-review-dossiers.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const dossier of report.dossiers) {
    const lines = [
      `# Migration review dossier — ${dossier.filename}`,
      '',
      `- Version: \`${dossier.version ?? 'invalid'}\``,
      `- SQL SHA-256: \`${dossier.sqlSha256}\``,
      `- Classification reasons: ${(dossier.classificationReasons ?? []).join(', ') || 'none'}`,
      `- Parsed operations: ${dossier.extractedObjectCount}`,
      `- Target-state matches: ${dossier.targetStateMatchedCount}`,
      `- Target-state mismatches: ${dossier.targetStateUnmatchedCount}`,
      `- Unresolved statements: ${dossier.unresolvedStatementCount}`,
      `- Candidate: \`${dossier.candidate.classification}\` (${dossier.candidate.confidence})`,
      `- Candidate object state: \`${dossier.candidate.objectState}\``,
      `- Object proof digest: \`${dossier.objectProofDigest ?? 'not supplied'}\``,
      '',
      '## Evidence boundary',
      '',
      'Candidate evidence is not approval and does not prove that the migration was applied. Target-state matching only describes deterministic catalog observations for parsed statements. Duplicate versions, invalid timestamps, data mutations, dynamic SQL and unsupported semantics remain fail-closed for human review.',
      '',
      '## Parsed operations',
      '',
      ...(dossier.operations.length ? dossier.operations.map((operation) => (
        `- ${operation.kind} ${operation.action} \`${operation.key}\` — expected: \`${operation.expectedState}\`; observed: \`${operation.observedState}\`; target matched: \`${operation.targetStateMatched === true}\``
      )) : ['- No deterministic catalog operation was extracted; direct SQL review required.']),
      '',
      '## Unresolved statements',
      '',
      ...(dossier.unresolved.length ? dossier.unresolved.map((item) => `- ${item.reason} — statement SHA-256: \`${item.statementSha256}\``) : ['- None reported by the parser.']),
      '',
      '## Candidate rationale',
      '',
      dossier.candidate.rationale ?? 'No candidate rationale supplied.',
      '',
      '## Human decision',
      '',
      '- Classification:',
      '- Rationale:',
      '- Evidence references:',
      '- Reviewer:',
      '- Reviewer role:',
      '- Reviewed at:',
      '',
    ];
    await writeFile(path.join(outputDir, `${dossier.filename}.md`), lines.join('\n'));
  }
  console.log(JSON.stringify(report.counts, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
