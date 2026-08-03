import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './migration-object-evidence-core.mjs';
import { refineMigrationSemanticEvidence } from './refine-migration-semantic-evidence.mjs';

function matchedTableOperation(statement) {
  return {
    kind: 'TABLE',
    action: 'ALTER_TARGET',
    key: 'public.alpha',
    expectedState: 'PRESENT',
    observedState: 'PRESENT',
    targetStateMatched: true,
    statementSha256: sha256(statement),
  };
}

async function runCase({ sql, catalog, action, filename = '20260101000000_case.sql' }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'semantic-review-regression-'));
  const migrationsDir = path.join(root, 'migrations');
  const outputDir = path.join(root, 'output');
  await mkdir(migrationsDir, { recursive: true });
  await writeFile(path.join(migrationsDir, filename), sql);

  const catalogPath = path.join(root, 'catalog.txt');
  await writeFile(catalogPath, catalog);
  const catalogBytes = await readFile(catalogPath);
  const report = {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    acceptedDecisions: 0,
    source: {
      catalogSha256: sha256(catalogBytes),
    },
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
    safety: {
      databaseModified: false,
      migrationHistoryModified: false,
      productionPushAuthorized: false,
      automaticClassificationAllowed: false,
      candidateEvidenceIsApproval: false,
    },
    items: [{
      version: filename.slice(0, 14),
      filename,
      sha256: sha256(sql),
      byteLength: Buffer.byteLength(sql),
      duplicateVersion: false,
      classificationReasons: ['LOCAL_ONLY_VERSION'],
      operations: [matchedTableOperation(sql)],
      unresolved: [{
        reason: 'ALTER_TABLE_ACTION_NOT_PROVABLE_FROM_CATALOG',
        statementSha256: sha256(action),
      }],
      objectProofDigest: '0'.repeat(64),
      candidate: {
        objectState: 'MIXED_OR_PARTIAL',
        candidateClassification: 'REQUIRES_SPLIT_REVIEW',
        confidence: 'LOW',
        humanDecisionRequired: true,
        automaticClassificationAllowed: false,
      },
    }],
  };
  const reportPath = path.join(root, 'report.json');
  await writeFile(reportPath, JSON.stringify(report));

  await refineMigrationSemanticEvidence([
    reportPath,
    catalogPath,
    migrationsDir,
    outputDir,
  ]);
  return JSON.parse(
    await readFile(path.join(outputDir, 'migration-object-evidence.json'), 'utf8'),
  ).items[0];
}

test('DROP NOT NULL on a missing column never matches the target state', async () => {
  const action = 'ALTER COLUMN missing_column DROP NOT NULL';
  const item = await runCase({
    sql: `ALTER TABLE public.alpha ${action};`,
    action,
    catalog: [
      'table|public|alpha|r|f|f|postgres',
      'migration|20251201000000|baseline',
      '',
    ].join('\n'),
  });

  const nullability = item.operations.find((entry) => (
    entry.kind === 'COLUMN_NULLABILITY'
  ));
  assert.equal(nullability.observedState, 'COLUMN_MISSING');
  assert.equal(nullability.targetStateMatched, false);
  assert.notEqual(item.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('cast equivalence rejects a materially different default expression', async () => {
  const action = "ALTER COLUMN title SET DEFAULT 'ready'";
  const item = await runCase({
    sql: `ALTER TABLE public.alpha ${action};`,
    action,
    catalog: [
      'table|public|alpha|r|f|f|postgres',
      "column|public|alpha|1|title|text|text|YES|'ready'::text || '-legacy'::text",
      'migration|20251201000000|baseline',
      '',
    ].join('\n'),
  });

  const defaultOperation = item.operations.find((entry) => (
    entry.kind === 'COLUMN_DEFAULT'
  ));
  assert.equal(defaultOperation.targetStateMatched, false);
  assert.notEqual(item.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('validated and NOT VALID constraints remain distinct target states', async () => {
  const action = 'ADD CONSTRAINT alpha_workspace_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)';
  const item = await runCase({
    sql: `ALTER TABLE public.alpha ${action};`,
    action,
    catalog: [
      'table|public|alpha|r|f|f|postgres',
      'column|public|alpha|1|workspace_id|uuid|uuid|YES|',
      'constraint|public|alpha|alpha_workspace_fkey|f|FOREIGN KEY (workspace_id) REFERENCES workspaces(id) NOT VALID',
      'migration|20251201000000|baseline',
      '',
    ].join('\n'),
  });

  const constraint = item.operations.find((entry) => (
    entry.kind === 'CONSTRAINT_DEFINITION'
  ));
  assert.equal(constraint.targetStateMatched, false);
  assert.notEqual(item.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('a complete PostgreSQL cast chain remains an accepted default equivalence', async () => {
  const action = "ALTER COLUMN title SET DEFAULT 'ready'";
  const item = await runCase({
    sql: `ALTER TABLE public.alpha ${action};`,
    action,
    catalog: [
      'table|public|alpha|r|f|f|postgres',
      "column|public|alpha|1|title|text|text|YES|('ready'::text)",
      'migration|20251201000000|baseline',
      '',
    ].join('\n'),
  });

  const defaultOperation = item.operations.find((entry) => (
    entry.kind === 'COLUMN_DEFAULT'
  ));
  assert.equal(defaultOperation.targetStateMatched, true);
  assert.equal(item.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(item.candidate.humanDecisionRequired, true);
});
