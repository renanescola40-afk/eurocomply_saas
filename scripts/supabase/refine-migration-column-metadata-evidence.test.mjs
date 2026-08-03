import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { sha256 } from './migration-object-evidence-core.mjs';
import { refineMigrationColumnMetadataEvidence } from './refine-migration-column-metadata-evidence.mjs';

function columnLine({
  table = 'demo',
  ordinal,
  name,
  dataType,
  udtName,
  nullable = 'NO',
  defaultValue = '',
  formattedType,
  charLength = '',
  numericPrecision = '',
  numericScale = '',
  datetimePrecision = '',
  isIdentity = 'NO',
  identityGeneration = '',
  isGenerated = 'NEVER',
  generationExpression = '',
  collationSchema = '',
  collationName = '',
  domainSchema = '',
  domainName = '',
}) {
  return [
    'column', 'public', table, ordinal, name, dataType, udtName, nullable,
    defaultValue, formattedType, charLength, numericPrecision, numericScale,
    datetimePrecision, isIdentity, identityGeneration, isGenerated,
    generationExpression, collationSchema, collationName, domainSchema, domainName,
  ].join('|');
}

function baseReport(filename, sql, definitions) {
  const item = {
    version: '20260804010000',
    filename,
    sha256: sha256(sql),
    byteLength: Buffer.byteLength(sql),
    duplicateVersion: false,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
    operations: [
      {
        kind: 'TABLE',
        action: 'CREATE',
        key: 'public.demo',
        expectedState: 'PRESENT',
        observedState: 'PRESENT',
        targetStateMatched: true,
        statementSha256: sha256(sql),
      },
      ...definitions.map((definition) => {
        const column = definition.match(/^([a-z_]+)/i)?.[1] ?? 'unknown';
        return {
          kind: 'COLUMN',
          action: 'CREATE',
          key: `public.demo.${column}`,
          expectedState: 'PRESENT',
          observedState: 'PRESENT',
          targetStateMatched: true,
          statementSha256: sha256(definition),
        };
      }),
    ],
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
      matchedOperations: definitions.length + 1,
      unmatchedOperations: 0,
      unresolvedStatements: definitions.length,
      humanDecisionRequired: true,
      automaticClassificationAllowed: false,
    },
  };
  return {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: '2026-08-04T00:00:00Z',
    source: {
      targetSha: '1'.repeat(40),
      catalogSha256: 'source-catalog',
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
    items: [item],
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

async function runFixture({ sql, definitions, catalogLines, mutateReport }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'column-metadata-evidence-'));
  const migrationsDir = path.join(root, 'migrations');
  const outputDir = path.join(root, 'output');
  await mkdir(migrationsDir);
  const filename = '20260804010000_demo.sql';
  await writeFile(path.join(migrationsDir, filename), sql);
  const report = baseReport(filename, sql, definitions);
  mutateReport?.(report);
  const reportPath = path.join(root, 'report.json');
  const catalogPath = path.join(root, 'catalog.txt');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(catalogPath, `${catalogLines.join('\n')}\n`);
  const result = await refineMigrationColumnMetadataEvidence([
    reportPath,
    catalogPath,
    migrationsDir,
    outputDir,
  ]);
  return {
    root,
    outputDir,
    result,
    persisted: JSON.parse(await readFile(path.join(outputDir, 'migration-object-evidence.json'), 'utf8')),
  };
}

const definitions = [
  'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
  'code character varying(64) COLLATE pg_catalog."C" NOT NULL UNIQUE',
  'amount numeric(12,2) CHECK (amount >= 0)',
  'slug text GENERATED ALWAYS AS (lower(code)) STORED',
];
const sql = `CREATE TABLE public.demo (\n  ${definitions.join(',\n  ')}\n);\n`;

function matchingCatalog({ invalidCheck = false, wrongGenerated = false, wrongCodeType = false } = {}) {
  return [
    columnLine({ ordinal: 1, name: 'id', dataType: 'bigint', udtName: 'int8', formattedType: 'bigint', isIdentity: 'YES', identityGeneration: 'ALWAYS' }),
    columnLine({ ordinal: 2, name: 'code', dataType: 'character varying', udtName: 'varchar', formattedType: wrongCodeType ? 'character varying(32)' : 'character varying(64)', charLength: wrongCodeType ? '32' : '64', collationSchema: 'pg_catalog', collationName: 'C' }),
    columnLine({ ordinal: 3, name: 'amount', dataType: 'numeric', udtName: 'numeric', formattedType: 'numeric(12,2)', numericPrecision: '12', numericScale: '2' }),
    columnLine({ ordinal: 4, name: 'slug', dataType: 'text', udtName: 'text', formattedType: 'text', isGenerated: 'ALWAYS', generationExpression: wrongGenerated ? 'upper(code)' : 'lower(code)' }),
    'constraint|public|demo|demo_pkey|p|PRIMARY KEY (id)',
    'constraint|public|demo|demo_code_key|u|UNIQUE (code)',
    `constraint|public|demo|demo_amount_check|c|CHECK (amount >= 0)${invalidCheck ? ' NOT VALID' : ''}`,
    `constraint_state|public|demo|demo_amount_check|${invalidCheck ? 'f' : 't'}|f|f| | | `,
  ];
}

test('promotes exact enriched column metadata to an already-present candidate without accepting a decision', async () => {
  const { result, persisted, outputDir } = await runFixture({
    sql,
    definitions,
    catalogLines: matchingCatalog(),
  });
  assert.equal(result.items[0].unresolved.length, 0);
  assert.equal(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(result.items[0].candidate.humanDecisionRequired, true);
  assert.equal(result.acceptedDecisions, 0);
  assert.equal(result.columnMetadataRefinement.acceptedDecisions, 0);
  assert.ok(result.columnMetadataRefinement.addedMetadataOperations > 0);
  assert.equal(persisted.safety.productionPushAuthorized, false);
  assert.match(await readFile(path.join(outputDir, 'column-metadata-refinement.md'), 'utf8'), /Accepted decisions: 0/);
});

test('keeps mismatched typmods and generated expressions out of the already-present classification', async () => {
  const { result } = await runFixture({
    sql,
    definitions,
    catalogLines: matchingCatalog({ wrongCodeType: true, wrongGenerated: true }),
  });
  assert.notEqual(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.ok(result.items[0].candidate.unmatchedOperations >= 2);
  assert.equal(result.acceptedDecisions, 0);
});

test('does not treat an unvalidated production constraint as a validated migration target', async () => {
  const { result } = await runFixture({
    sql,
    definitions,
    catalogLines: matchingCatalog({ invalidCheck: true }),
  });
  assert.notEqual(result.items[0].candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.ok(result.items[0].candidate.unmatchedOperations >= 1);
});

test('keeps identity options fail-closed instead of claiming exact metadata equivalence', async () => {
  const identityWithOptions = 'id bigint GENERATED ALWAYS AS IDENTITY (START WITH 100) PRIMARY KEY';
  const fixtureSql = `CREATE TABLE public.demo (${identityWithOptions});\n`;
  const { result } = await runFixture({
    sql: fixtureSql,
    definitions: [identityWithOptions],
    catalogLines: [
      columnLine({ ordinal: 1, name: 'id', dataType: 'bigint', udtName: 'int8', formattedType: 'bigint', isIdentity: 'YES', identityGeneration: 'ALWAYS' }),
      'constraint|public|demo|demo_pkey|p|PRIMARY KEY (id)',
    ],
  });
  assert.equal(result.items[0].candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(result.items[0].unresolved.length, 1);
});

test('rejects a legacy catalog that does not expose formatted_type metadata', async () => {
  await assert.rejects(
    runFixture({
      sql,
      definitions,
      catalogLines: ['column|public|demo|1|id|bigint|int8|NO|'],
    }),
    /missing formatted column type metadata/,
  );
});

test('rejects a migration whose bytes differ from the immutable source report', async () => {
  await assert.rejects(
    runFixture({
      sql,
      definitions,
      catalogLines: matchingCatalog(),
      mutateReport(report) {
        report.items[0].sha256 = '0'.repeat(64);
      },
    }),
    /migration digest mismatch/,
  );
});
