#!/usr/bin/env node

import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  candidateFor,
  sha256,
} from './migration-object-evidence-core.mjs';

const CLOSABLE_REASON = 'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW';
const EVIDENCE_LAYER = 'ABSENT_COLUMN_CLOSURE_REFINEMENT';

function matchingAbsentColumnOperations(item, statementSha256) {
  return item.operations.filter((operation) => (
    operation.statementSha256 === statementSha256
    && operation.kind === 'COLUMN'
    && operation.expectedState === 'PRESENT'
    && operation.observedState === 'ABSENT'
    && operation.targetStateMatched === false
  ));
}

function closureOperation(columnOperation, statementSha256) {
  return {
    kind: 'INLINE_COLUMN_TARGET_STATE',
    action: 'ABSENCE_CLOSURE',
    key: `${columnOperation.key}.inline.${statementSha256.slice(0, 16)}`,
    expectedState: 'PRESENT',
    observedState: 'ABSENT',
    targetStateMatched: false,
    statementSha256,
    evidenceLayer: EVIDENCE_LAYER,
    closureBasis: {
      parentKind: columnOperation.kind,
      parentKey: columnOperation.key,
      parentExpectedState: columnOperation.expectedState,
      parentObservedState: columnOperation.observedState,
      rule: 'An absent target column cannot already contain its inline target constraints, references, defaults, identity, generated expression or nullability state.',
    },
  };
}

function dedupeOperations(operations) {
  const seen = new Set();
  return operations.filter((operation) => {
    const key = [
      operation.kind,
      operation.action,
      operation.key,
      operation.expectedState,
      operation.observedState,
      operation.statementSha256,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recomputeCounts(items) {
  return {
    inventoryItems: items.length,
    targetStatePresent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_PRESENT').length,
    targetStateAbsent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_ABSENT').length,
    mixedOrPartial: items.filter((item) => item.candidate.objectState === 'MIXED_OR_PARTIAL').length,
    unprovable: items.filter((item) => item.candidate.objectState === 'UNPROVABLE').length,
    candidateAlreadyPresent: items.filter((item) => item.candidate.candidateClassification === 'ALREADY_PRESENT_IN_SCHEMA').length,
    candidatePendingDeployment: items.filter((item) => item.candidate.candidateClassification === 'PENDING_DEPLOYMENT').length,
    candidateSplitReview: items.filter((item) => item.candidate.candidateClassification === 'REQUIRES_SPLIT_REVIEW').length,
  };
}

async function writeBatches(outputDir, report) {
  for (const filename of await readdir(outputDir)) {
    if (/^batch-\d{3}-of-\d{3}\.json$/.test(filename)) {
      await unlink(path.join(outputDir, filename));
    }
  }

  const batchSize = 25;
  const batchCount = Math.ceil(report.items.length / batchSize);
  for (let index = 0; index < batchCount; index += 1) {
    const batchNumber = index + 1;
    const batchId = `batch-${String(batchNumber).padStart(3, '0')}-of-${String(batchCount).padStart(3, '0')}`;
    const batch = {
      schema: 'risck-comply.supabase-migration-object-evidence-batch.v1',
      status: 'HUMAN_REVIEW_REQUIRED',
      batchId,
      batchNumber,
      batchCount,
      source: report.source,
      semanticRefinement: report.semanticRefinement,
      columnMetadataRefinement: report.columnMetadataRefinement,
      absenceClosureRefinement: report.absenceClosureRefinement,
      items: report.items.slice(index * batchSize, (index + 1) * batchSize),
      acceptedDecisions: 0,
    };
    await writeFile(
      path.join(outputDir, `${batchId}.json`),
      `${JSON.stringify(batch, null, 2)}\n`,
    );
  }
}

function assertNonCreditingSource(report) {
  if (report.schema !== 'risck-comply.supabase-migration-object-evidence.v1') {
    throw new Error('unsupported migration object evidence schema');
  }
  if (report.status !== 'HUMAN_REVIEW_REQUIRED' || report.acceptedDecisions !== 0) {
    throw new Error('source evidence violates the non-crediting boundary');
  }
  if (report.semanticRefinement?.status !== 'HUMAN_REVIEW_REQUIRED') {
    throw new Error('semantic refinement evidence is required');
  }
  if (report.columnMetadataRefinement?.status !== 'HUMAN_REVIEW_REQUIRED') {
    throw new Error('column metadata refinement evidence is required');
  }
  if (report.semanticRefinement?.acceptedDecisions !== 0) {
    throw new Error('semantic refinement contains accepted decisions');
  }
  if (report.columnMetadataRefinement?.acceptedDecisions !== 0) {
    throw new Error('column metadata refinement contains accepted decisions');
  }
  if (report.safety?.productionPushAuthorized === true) {
    throw new Error('source evidence unexpectedly authorizes production push');
  }
}

export async function refineMigrationAbsenceClosureEvidence(argv = process.argv.slice(2)) {
  const [reportPath, migrationsDir, outputDir] = argv;
  if (!reportPath || !migrationsDir || !outputDir) {
    throw new Error('usage: column-metadata-report.json migrations-dir output-dir');
  }

  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assertNonCreditingSource(report);

  const countsBefore = report.counts;
  let resolvedUnresolvedEntries = 0;
  let addedClosureOperations = 0;
  let affectedMigrations = 0;
  const promotedToPending = [];

  for (const item of report.items) {
    const migrationBytes = await readFile(path.join(migrationsDir, item.filename));
    if (sha256(migrationBytes) !== item.sha256) {
      throw new Error(`migration digest mismatch for ${item.filename}`);
    }

    const previousClassification = item.candidate.candidateClassification;
    const retainedUnresolved = [];
    const additions = [];
    let itemResolvedEntries = 0;

    for (const entry of item.unresolved) {
      if (entry.reason !== CLOSABLE_REASON) {
        retainedUnresolved.push(entry);
        continue;
      }

      const absentColumnOperations = matchingAbsentColumnOperations(item, entry.statementSha256);
      if (absentColumnOperations.length === 0) {
        retainedUnresolved.push(entry);
        continue;
      }

      for (const columnOperation of absentColumnOperations) {
        additions.push(closureOperation(columnOperation, entry.statementSha256));
      }
      itemResolvedEntries += 1;
    }

    if (itemResolvedEntries > 0) {
      affectedMigrations += 1;
      resolvedUnresolvedEntries += itemResolvedEntries;
    }

    const operations = dedupeOperations([...item.operations, ...additions]);
    addedClosureOperations += operations.length - item.operations.length;
    item.operations = operations;
    item.unresolved = retainedUnresolved;
    item.candidate = candidateFor(item, operations, retainedUnresolved);
    item.objectProofDigest = sha256(JSON.stringify({
      migrationSha256: item.sha256,
      sourceObjectProofDigest: item.objectProofDigest,
      operations,
      unresolved: retainedUnresolved,
      evidenceLayer: EVIDENCE_LAYER,
    }));

    if (
      previousClassification === 'REQUIRES_SPLIT_REVIEW'
      && item.candidate.candidateClassification === 'PENDING_DEPLOYMENT'
    ) {
      promotedToPending.push(item.filename);
    }
  }

  report.counts = recomputeCounts(report.items);
  report.absenceClosureRefinement = {
    schema: 'risck-comply.supabase-migration-absence-closure-refinement.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: new Date().toISOString(),
    countsBefore,
    countsAfter: report.counts,
    closableReason: CLOSABLE_REASON,
    evidenceLayer: EVIDENCE_LAYER,
    resolvedUnresolvedEntries,
    addedClosureOperations,
    affectedMigrations,
    promotedToPending,
    acceptedDecisions: 0,
    automaticClassificationAllowed: false,
    productionWriteAuthorized: false,
    productionWritePerformed: false,
  };
  report.acceptedDecisions = 0;
  report.safety.automaticClassificationAllowed = false;
  report.safety.candidateEvidenceIsApproval = false;
  report.safety.productionPushAuthorized = false;

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, 'migration-object-evidence.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeFile(
    path.join(outputDir, 'absence-closure-refinement-summary.json'),
    `${JSON.stringify(report.absenceClosureRefinement, null, 2)}\n`,
  );
  await writeBatches(outputDir, report);

  const summary = [
    '# Supabase migration absent-column closure refinement',
    '',
    'Status: **HUMAN_REVIEW_REQUIRED**',
    '',
    `- Inventory items: ${report.counts.inventoryItems}`,
    `- Candidate already present: ${countsBefore.candidateAlreadyPresent} → ${report.counts.candidateAlreadyPresent}`,
    `- Candidate pending deployment: ${countsBefore.candidatePendingDeployment} → ${report.counts.candidatePendingDeployment}`,
    `- Candidate split review: ${countsBefore.candidateSplitReview} → ${report.counts.candidateSplitReview}`,
    `- Resolved absent-column inline entries: ${resolvedUnresolvedEntries}`,
    `- Added closure operations: ${addedClosureOperations}`,
    `- Affected migrations: ${affectedMigrations}`,
    `- Promoted to pending deployment: ${promotedToPending.length}`,
    '- Accepted decisions: 0',
    '- Production writes: not authorised and not executed',
    '',
  ].join('\n');
  await writeFile(path.join(outputDir, 'absence-closure-refinement.md'), summary);
  process.stdout.write(summary);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refineMigrationAbsenceClosureEvidence().catch((error) => {
    console.error(`Migration absence closure refinement failed: ${error.message}`);
    process.exit(1);
  });
}
