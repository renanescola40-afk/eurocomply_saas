import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { sha256 } from './migration-object-evidence-core.mjs';

const execFileAsync = promisify(execFile);
const buildScript = new URL('./build-migration-object-evidence.mjs', import.meta.url).pathname;
const refineScript = new URL('./refine-migration-semantic-evidence.mjs', import.meta.url).pathname;

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'migration-semantic-evidence-'));
  const migrationsDir = path.join(root, 'migrations');
  const initialOutput = path.join(root, 'initial');
  const refinedOutput = path.join(root, 'refined');
  await mkdir(migrationsDir, { recursive: true });

  const migrations = {
    '20260101000000_alpha_present.sql': `
      create table public.alpha (
        id uuid primary key default gen_random_uuid(),
        workspace_id uuid references public.workspaces(id) on delete cascade,
        title text not null
      );
    `,
    '20260101000100_alpha_alter.sql': `
      alter table public.alpha
        alter column title type text,
        alter column title set not null,
        alter column title set default 'ready';
    `,
    '20260101000200_beta_pending.sql': `
      create table public.beta (
        id uuid primary key,
        title text not null
      );
    `,
    '20260101000300_checked_manual.sql': `
      create table public.checked_values (
        id uuid check (id is not null)
      );
    `,
    '20260101000400_duplicate_present.sql': `
      create table public.alpha_copy (
        id uuid primary key
      );
    `,
  };

  for (const [filename, sql] of Object.entries(migrations)) {
    await writeFile(path.join(migrationsDir, filename), sql);
  }

  const inventory = {
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    generatedAt: '2026-08-03T00:00:00.000Z',
    items: Object.entries(migrations).map(([filename, sql], index) => ({
      version: filename.slice(0, 14),
      filename,
      sha256: sha256(sql),
      byteLength: Buffer.byteLength(sql),
      duplicateVersion: index === 4,
      classificationReasons: index === 4
        ? ['LOCAL_ONLY_VERSION', 'DUPLICATE_VERSION']
        : ['LOCAL_ONLY_VERSION'],
    })),
  };
  const inventoryPath = path.join(root, 'inventory.json');
  await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`);

  const catalog = [
    'table|public|workspaces|r|t|f|postgres',
    'column|public|workspaces|1|id|uuid|uuid|NO|',
    'table|public|alpha|r|t|f|postgres',
    'column|public|alpha|1|id|uuid|uuid|NO|gen_random_uuid()',
    "column|public|alpha|2|workspace_id|uuid|uuid|YES|",
    "column|public|alpha|3|title|text|text|NO|'ready'::text",
    'constraint|public|alpha|alpha_pkey|p|PRIMARY KEY (id)',
    'constraint|public|alpha|alpha_workspace_id_fkey|f|FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE',
    'table|public|checked_values|r|f|f|postgres',
    'column|public|checked_values|1|id|uuid|uuid|YES|',
    'constraint|public|checked_values|checked_values_id_check|c|CHECK ((id IS NOT NULL))',
    'table|public|alpha_copy|r|f|f|postgres',
    'column|public|alpha_copy|1|id|uuid|uuid|NO|',
    'constraint|public|alpha_copy|alpha_copy_pkey|p|PRIMARY KEY (id)',
    'migration|20251201000000|baseline',
    '',
  ].join('\n');
  const catalogPath = path.join(root, 'catalog.txt');
  await writeFile(catalogPath, catalog);

  return {
    root,
    migrationsDir,
    initialOutput,
    refinedOutput,
    inventoryPath,
    catalogPath,
  };
}

async function runPipeline(paths) {
  await execFileAsync('node', [
    buildScript,
    paths.inventoryPath,
    paths.catalogPath,
    paths.migrationsDir,
    paths.initialOutput,
    '--target-sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '--dry-run-id=123',
    '--schema-evidence-run-id=456',
  ]);
  await execFileAsync('node', [
    refineScript,
    path.join(paths.initialOutput, 'migration-object-evidence.json'),
    paths.catalogPath,
    paths.migrationsDir,
    paths.refinedOutput,
  ]);
  return JSON.parse(
    await readFile(path.join(paths.refinedOutput, 'migration-object-evidence.json'), 'utf8'),
  );
}

test('refines type, default, nullability, primary-key and foreign-key evidence', async () => {
  const paths = await createFixture();
  const report = await runPipeline(paths);
  const byFile = new Map(report.items.map((item) => [item.filename, item]));
  const present = byFile.get('20260101000000_alpha_present.sql');
  const altered = byFile.get('20260101000100_alpha_alter.sql');

  assert.equal(present.candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.equal(present.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(present.unresolved.length, 0);
  assert.ok(present.operations.some((entry) => entry.kind === 'COLUMN_DEFAULT'));
  assert.ok(present.operations.some((entry) => entry.kind === 'COLUMN_NULLABILITY'));
  assert.equal(
    present.operations.filter((entry) => entry.kind === 'CONSTRAINT_DEFINITION').length,
    2,
  );

  assert.equal(altered.candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.equal(altered.candidate.candidateClassification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(altered.unresolved.length, 0);
  assert.ok(altered.operations.some((entry) => entry.action === 'ALTER_TYPE'));
  assert.ok(altered.operations.some((entry) => entry.action === 'SET_DEFAULT'));
});

test('keeps pending, check and duplicate cases within the non-crediting boundary', async () => {
  const paths = await createFixture();
  const report = await runPipeline(paths);
  const byFile = new Map(report.items.map((item) => [item.filename, item]));

  const pending = byFile.get('20260101000200_beta_pending.sql');
  assert.equal(pending.candidate.objectState, 'TARGET_STATE_ABSENT');
  assert.equal(pending.candidate.candidateClassification, 'PENDING_DEPLOYMENT');
  assert.equal(pending.unresolved.length, 0);

  const checked = byFile.get('20260101000300_checked_manual.sql');
  assert.equal(checked.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.ok(checked.unresolved.some((entry) => (
    entry.reason === 'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW'
  )));

  const duplicate = byFile.get('20260101000400_duplicate_present.sql');
  assert.equal(duplicate.candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.equal(duplicate.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(duplicate.candidate.humanDecisionRequired, true);

  assert.equal(report.acceptedDecisions, 0);
  assert.equal(report.semanticRefinement.acceptedDecisions, 0);
  assert.equal(report.semanticRefinement.automaticClassificationAllowed, false);
  assert.equal(report.safety.productionPushAuthorized, false);
});

test('retains immutable proof batches and refinement summary', async () => {
  const paths = await createFixture();
  const report = await runPipeline(paths);
  const batch = JSON.parse(
    await readFile(path.join(paths.refinedOutput, 'batch-001-of-001.json'), 'utf8'),
  );
  const summary = JSON.parse(
    await readFile(path.join(paths.refinedOutput, 'semantic-refinement-summary.json'), 'utf8'),
  );

  assert.equal(batch.status, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(batch.acceptedDecisions, 0);
  assert.equal(batch.items.length, report.items.length);
  assert.equal(summary.status, 'HUMAN_REVIEW_REQUIRED');
  assert.ok(summary.resolvedUnresolvedEntries > 0);
  assert.ok(summary.addedSemanticOperations > 0);
});

test('rejects a catalog digest that differs from the source artifact', async () => {
  const paths = await createFixture();
  await execFileAsync('node', [
    buildScript,
    paths.inventoryPath,
    paths.catalogPath,
    paths.migrationsDir,
    paths.initialOutput,
    '--target-sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '--dry-run-id=123',
    '--schema-evidence-run-id=456',
  ]);
  await writeFile(paths.catalogPath, 'table|public|tampered|r|f|f|postgres\n');

  await assert.rejects(execFileAsync('node', [
    refineScript,
    path.join(paths.initialOutput, 'migration-object-evidence.json'),
    paths.catalogPath,
    paths.migrationsDir,
    paths.refinedOutput,
  ]));
});
