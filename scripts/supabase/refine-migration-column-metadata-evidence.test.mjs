import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './migration-object-evidence-core.mjs';
import { refineMigrationColumnMetadataEvidence } from './refine-migration-column-metadata-evidence.mjs';

const hexRecord = (type, record) => (
  `${type}|${Buffer.from(JSON.stringify(record), 'utf8').toString('hex')}`
);

function column({
  name,
  ordinal = 1,
  nullable = 'YES',
  dataType = 'text',
  udtName = 'text',
  formattedType = dataType,
  defaultValue = '',
  isIdentity = 'NO',
  identityGeneration = '',
  isGenerated = 'NEVER',
  generationExpression = '',
  collationSchema = '',
  collationName = '',
}) {
  return hexRecord('column_meta_hex', {
    schema: 'public',
    table: 'demo',
    ordinalPosition: ordinal,
    column: name,
    dataType,
    udtName,
    nullable,
    defaultValue,
    formattedType,
    characterMaximumLength: '',
    numericPrecision: '',
    numericScale: '',
    datetimePrecision: '',
    isIdentity,
    identityGeneration,
    isGenerated,
    generationExpression,
    collationSchema,
    collationName,
    domainSchema: '',
    domainName: '',
  });
}

function constraint({ name, type, definition, validated = true }) {
  return hexRecord('constraint_meta_hex', {
    schema: 'public',
    table: 'demo',
    name,
    type,
    definition,
    validated,
    deferrable: false,
    deferred: false,
    matchType: ' ',
    updateType: ' ',
    deleteType: ' ',
  });
}

function sourceReport(filename, sql, definitions) {
  const operations = [{
    kind: 'TABLE',
    action: 'CREATE',
    key: 'public.demo',
    expectedState: 'PRESENT',
    observedState: 'PRESENT',
    targetStateMatched: true,
    statementSha256: sha256(sql),
  }];
  for (const definition of definitions) {
    operations.push({
      kind: 'COLUMN',
      action: 'CREATE',
      key: `public.demo.${definition.match(/^([a-z_]+)/i)?.[1] ?? 'unknown'}`,
      expectedState: 'PRESENT',
      observedState: 'PRESENT',
      targetStateMatched: true,
      statementSha256: sha256(definition),
    });
  }
  return {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: '2026-08-04T00:00:00Z',
    source: { targetSha: '1'.repeat(40), catalogSha256: 'source-catalog' },
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
    items: [{
      version: '20260804010000',
      filename,
      sha256: sha256(sql),
      byteLength: Buffer.byteLength(sql),
      duplicateVersion: false,
      classificationReasons: ['LOCAL_ONLY_VERSION'],
      operations,
      unresolved: definitions.map((definition) => ({
        reason: 'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW',
        statementSha256: sha256(definition),
      })),
      objectProofDigest: 'source-proof',
      candidate: {
        objectState: 'MIXED_OR_PARTIAL',
        candidateClassification: 'REQUIRES_SPLIT_REVIEW',
        confidence: 'LOW',
        rationale: 'fixture',
        matchedOperations: operations.length,
        unmatchedOperations: 0,
        unresolvedStatements: definitions.length,
        humanDecisionRequired: true,
        automaticClassificationAllowed: false,
      },
    }],
    acceptedDecisions: 0,
    safety: {
      automaticClassificationAllowed: false,
      candidateEvidenceIsApproval: false,
      databaseModified: false,
      migrationHistoryModified: false,
      productionPushAuthorized: false,
    },
    semanticRefinement: {
      schema: 'risck-comply.supabase-migration-semantic-refinement.v1',
      status: 'HUMAN_REVIEW_REQUIRED',
      acceptedDecisions: 0,
      automaticClassificationAllowed: false,
    },
  };
}

async function runFixture({ definitions, catalog, mutateReport }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'column-metadata-evidence-'));
  const migrationsDir = path.join(root, 'migrations');
  const outputDir = path.join(root, 'output');
  await mkdir(migrationsDir);
  const filename = '20260804010000_demo.sql';
  const sql = `CREATE TABLE public.demo (\n  ${definitions.join(',\n  ')}\n);\n`;
  await writeFile(path.join(migrationsDir, filename), sql);
  const report = sourceReport(filename, sql, definitions);
  mutateReport?.(report);
  const reportPath = path.join(root, 'report.json');
  const catalogPath = path.join(root, 'catalog.txt');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(catalogPath, `${catalog.join('\n')}\n`);
  const result = await refineMigrationColumnMetadataEvidence([
    reportPath,
    catalogPath,
    migrationsDir,
    outputDir,
  ]);
  return { result, outputDir };
}

const exactDefinitions = [
  'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
  'code character varying(64) COLLATE pg_catalog."C" NOT NULL UNIQUE',
  'amount numeric(12,2) CHECK (amount >= 0)',
  'slug text GENERATED ALWAYS AS (lower(code)) STORED',
];

function exactCatalog({ wrongType = false, wrongGenerated = false, invalidCheck = false } = {}) {
  return [
    column({ name: 'id', ordinal: 1, nullable: 'NO', dataType: 'bigint', udtName: 'int8', formattedType: 'bigint', isIdentity: 'YES', identityGeneration: 'ALWAYS' }),
    column({ name: 'code', ordinal: 2, nullable: 'NO', dataType: 'character varying', udtName: 'varchar', formattedType: wrongType ? 'character varying(32)' : 'character varying(64)', collationSchema: 'pg_catalog', collationName: 'C' }),
    column({ name: 'amount', ordinal: 3, dataType: 'numeric', udtName: 'numeric', formattedType: 'numeric(12,2)' }),
    column({ name: 'slug', ordinal: 4, isGenerated: 'ALWAYS', generationExpression: wrongGenerated ? 'upper(code)' : 'lower(code)' }),
    constraint({ name: 'demo_pkey', type: 'p', definition: 'PRIMARY KEY (id)' }),
    constraint({ name: 'demo_code_key', type: 'u', definition: 'UNIQUE (code)' }),
    constraint({ name: 'demo_amount_check', type: 'c', definition: `CHECK (amount >= 0)${invalidCheck ? ' NOT VALID' : ''}`, validated: !invalidCheck }),
  ];
}

test('promotes only exact enriched metadata while retaining human review', async () => {
  const { result, outputDir } = await runFixture({ definitions: exactDefinitions, catalog: exactCatalog() });
  assert.equal(result.items[0].unresolved.length, 0);
  assert.equal(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(result.items[0].candidate.humanDecisionRequired, true);
  assert.equal(result.acceptedDecisions, 0);
  assert.equal(result.safety.productionPushAuthorized, false);
  assert.match(await readFile(path.join(outputDir, 'column-metadata-refinement.md'), 'utf8'), /Accepted decisions: 0/);
});

test('rejects mismatched typmods and generated expressions', async () => {
  const { result } = await runFixture({
    definitions: exactDefinitions,
    catalog: exactCatalog({ wrongType: true, wrongGenerated: true }),
  });
  assert.notEqual(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.ok(result.items[0].candidate.unmatchedOperations >= 2);
});

test('does not equate an unvalidated production constraint with a validated target', async () => {
  const { result } = await runFixture({
    definitions: exactDefinitions,
    catalog: exactCatalog({ invalidCheck: true }),
  });
  assert.notEqual(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('compares implicit nullable state and catches production NOT NULL drift', async () => {
  const definition = 'note text CHECK (char_length(note) > 0)';
  const { result } = await runFixture({
    definitions: [definition],
    catalog: [
      column({ name: 'note', nullable: 'NO' }),
      constraint({ name: 'demo_note_check', type: 'c', definition: 'CHECK (char_length(note) > 0)' }),
    ],
  });
  assert.notEqual(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('parses pipe operators without shifting enriched metadata fields', async () => {
  const definition = "label text DEFAULT ('a' || '|' || 'b')";
  const { result } = await runFixture({
    definitions: [definition],
    catalog: [
      column({ name: 'label', defaultValue: "('a' || '|' || 'b')" }),
      constraint({ name: 'catalog_sentinel', type: 'c', definition: 'CHECK (true)' }),
    ],
  });
  assert.equal(result.items[0].unresolved.length, 0);
  assert.equal(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
});

test('keeps identity options fail-closed', async () => {
  const definition = 'id bigint GENERATED ALWAYS AS IDENTITY (START WITH 100) PRIMARY KEY';
  const { result } = await runFixture({
    definitions: [definition],
    catalog: [
      column({ name: 'id', nullable: 'NO', dataType: 'bigint', udtName: 'int8', formattedType: 'bigint', isIdentity: 'YES', identityGeneration: 'ALWAYS' }),
      constraint({ name: 'demo_pkey', type: 'p', definition: 'PRIMARY KEY (id)' }),
    ],
  });
  assert.equal(result.items[0].candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(result.items[0].unresolved.length, 1);
});

test('rejects legacy delimiter-ambiguous catalogs', async () => {
  await assert.rejects(
    runFixture({ definitions: exactDefinitions, catalog: ['column|public|demo|1|id|bigint|int8|NO|'] }),
    /missing safely encoded formatted column type metadata/,
  );
});

test('rejects changed migration bytes', async () => {
  await assert.rejects(
    runFixture({
      definitions: exactDefinitions,
      catalog: exactCatalog(),
      mutateReport(report) { report.items[0].sha256 = '0'.repeat(64); },
    }),
    /migration digest mismatch/,
  );
});
