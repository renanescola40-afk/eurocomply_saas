import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './migration-object-evidence-core.mjs';
import { refineMigrationAbsenceClosureEvidence } from './refine-migration-absence-closure-evidence.mjs';

function candidate(classification = 'REQUIRES_SPLIT_REVIEW') {
  return {
    objectState: classification === 'PENDING_DEPLOYMENT' ? 'TARGET_STATE_ABSENT' : 'MIXED_OR_PARTIAL',
    candidateClassification: classification,
    confidence: 'LOW',
    rationale: 'fixture',
    matchedOperations: 0,
    unmatchedOperations: 2,
    unresolvedStatements: 1,
    humanDecisionRequired: true,
    automaticClassificationAllowed: false,
  };
}

function reportFor({
  filename,
  sql,
  observedColumnState = 'ABSENT',
  unresolvedReason = 'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW',
  duplicateVersion = false,
  acceptedDecisions = 0,
}) {
  const definition = "status text not null default 'draft' check (status in ('draft','active'))";
  const definitionHash = sha256(definition);
  const tableMatched = observedColumnState === 'PRESENT';
  const columnMatched = observedColumnState === 'PRESENT';
  const item = {
    version: '20260804140000',
    filename,
    sha256: sha256(sql),
    byteLength: Buffer.byteLength(sql),
    duplicateVersion,
    classificationReasons: duplicateVersion ? ['LOCAL_ONLY_VERSION', 'DUPLICATE_VERSION'] : ['LOCAL_ONLY_VERSION'],
    operations: [
      {
        kind: 'TABLE',
        action: 'CREATE',
        key: 'public.demo',
        expectedState: 'PRESENT',
        observedState: tableMatched ? 'PRESENT' : 'ABSENT',
        targetStateMatched: tableMatched,
        statementSha256: sha256(sql),
      },
      {
        kind: 'COLUMN',
        action: 'CREATE',
        key: 'public.demo.status',
        expectedState: 'PRESENT',
        observedState: observedColumnState,
        targetStateMatched: columnMatched,
        statementSha256: definitionHash,
      },
    ],
    unresolved: [{ reason: unresolvedReason, statementSha256: definitionHash }],
    objectProofDigest: 'source-object-proof',
    candidate: candidate(),
  };

  return {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: '2026-08-04T13:20:46Z',
    source: { targetSha: 'a'.repeat(40), catalogSha256: 'b'.repeat(64) },
    counts: {
      inventoryItems: 1,
      targetStatePresent: 0,
      targetStateAbsent: 0,
      mixedOrPartial: 1,
      unprovable: 0,
      candidateAlreadyPresent: 0,
      candidatePendingDeployment: 0,
      candidateSplitReview: 1,
    },
    items: [item],
    acceptedDecisions,
    safety: {
      automaticClassificationAllowed: false,
      candidateEvidenceIsApproval: false,
      databaseModified: false,
      migrationHistoryModified: false,
      productionPushAuthorized: false,
    },
    semanticRefinement: {
      status: 'HUMAN_REVIEW_REQUIRED',
      acceptedDecisions: 0,
      automaticClassificationAllowed: false,
    },
    columnMetadataRefinement: {
      status: 'HUMAN_REVIEW_REQUIRED',
      acceptedDecisions: 0,
      automaticClassificationAllowed: false,
    },
  };
}

async function runFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'migration-absence-closure-'));
  const migrationsDir = path.join(root, 'migrations');
  const outputDir = path.join(root, 'output');
  await mkdir(migrationsDir);

  const filename = options.filename ?? '20260804140000_demo.sql';
  const definition = "status text not null default 'draft' check (status in ('draft','active'))";
  const sql = options.sql ?? `create table public.demo (${definition});\n`;
  await writeFile(path.join(migrationsDir, filename), sql);

  const report = reportFor({ filename, sql, ...options });
  options.mutateReport?.(report);
  const reportPath = path.join(root, 'migration-object-evidence.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const result = await refineMigrationAbsenceClosureEvidence([
    reportPath,
    migrationsDir,
    outputDir,
  ]);
  return { result, outputDir };
}

test('closes inline ambiguity only when the exact parent column is absent', async () => {
  const { result, outputDir } = await runFixture();
  const item = result.items[0];

  assert.equal(item.unresolved.length, 0);
  assert.equal(item.candidate.candidateClassification, 'PENDING_DEPLOYMENT');
  assert.equal(item.candidate.humanDecisionRequired, true);
  assert.equal(result.absenceClosureRefinement.resolvedUnresolvedEntries, 1);
  assert.equal(result.absenceClosureRefinement.promotedToPending.length, 1);
  assert.equal(result.acceptedDecisions, 0);
  assert.equal(result.safety.productionPushAuthorized, false);
  assert.ok(item.operations.some((operation) => (
    operation.kind === 'INLINE_COLUMN_TARGET_STATE'
    && operation.evidenceLayer === 'ABSENT_COLUMN_CLOSURE_REFINEMENT'
    && operation.observedState === 'ABSENT'
  )));
  assert.match(
    await readFile(path.join(outputDir, 'absence-closure-refinement.md'), 'utf8'),
    /Candidate pending deployment: 0 → 1/,
  );
});

test('keeps inline ambiguity when the parent column is present', async () => {
  const { result } = await runFixture({ observedColumnState: 'PRESENT' });
  assert.equal(result.items[0].unresolved.length, 1);
  assert.equal(result.items[0].candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(result.absenceClosureRefinement.resolvedUnresolvedEntries, 0);
  assert.equal(result.absenceClosureRefinement.addedClosureOperations, 0);
});

test('does not close dynamic SQL or other unresolved reasons', async () => {
  const { result } = await runFixture({ unresolvedReason: 'DYNAMIC_SQL_REQUIRES_MANUAL_REVIEW' });
  assert.equal(result.items[0].unresolved.length, 1);
  assert.equal(result.items[0].unresolved[0].reason, 'DYNAMIC_SQL_REQUIRES_MANUAL_REVIEW');
  assert.equal(result.absenceClosureRefinement.resolvedUnresolvedEntries, 0);
});

test('keeps duplicate migration versions in split review after absence closure', async () => {
  const { result } = await runFixture({ duplicateVersion: true });
  assert.equal(result.items[0].unresolved.length, 0);
  assert.equal(result.items[0].candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(result.absenceClosureRefinement.promotedToPending.length, 0);
});

test('rejects changed migration bytes', async () => {
  await assert.rejects(
    runFixture({
      mutateReport(report) {
        report.items[0].sha256 = '0'.repeat(64);
      },
    }),
    /migration digest mismatch/,
  );
});

test('rejects source evidence that already contains accepted decisions', async () => {
  await assert.rejects(
    runFixture({ acceptedDecisions: 1 }),
    /non-crediting boundary/,
  );
});
