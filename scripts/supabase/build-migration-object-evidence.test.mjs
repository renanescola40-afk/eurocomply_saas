import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = new URL('./build-migration-object-evidence.mjs', import.meta.url).pathname;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'migration-object-evidence-'));
  const migrationsDir = path.join(root, 'migrations');
  const outputDir = path.join(root, 'output');
  await mkdir(migrationsDir, { recursive: true });

  const sql = {
    '20260101000000_present.sql': `
      create table if not exists public.alpha (id uuid);
      alter table public.alpha add column if not exists label text;
      alter table public.alpha enable row level security;
      create policy alpha_select on public.alpha for select using (true);
    `,
    '20260101000100_pending.sql': 'create table if not exists public.beta (id uuid);',
    '20260101000200_data_only.sql': "insert into public.alpha (id) values ('00000000-0000-0000-0000-000000000000');",
    '20260101000300_drop_legacy.sql': 'drop table if exists public.legacy_table;',
  };
  for (const [filename, contents] of Object.entries(sql)) {
    await writeFile(path.join(migrationsDir, filename), contents);
  }

  const items = Object.entries(sql).map(([filename, contents]) => ({
    version: filename.slice(0, 14),
    filename,
    sha256: sha256(contents),
    byteLength: Buffer.byteLength(contents),
    duplicateVersion: false,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
  }));
  const inventoryPath = path.join(root, 'inventory.json');
  await writeFile(inventoryPath, `${JSON.stringify({
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    generatedAt: '2026-08-03T00:00:00.000Z',
    items,
  })}\n`);

  const catalogPath = path.join(root, 'catalog.txt');
  await writeFile(catalogPath, [
    'table|public|alpha|r|t|f|postgres',
    'column|public|alpha|1|id|uuid|uuid|NO|',
    'column|public|alpha|2|label|text|text|YES|',
    'policy|public|alpha|alpha_select|PERMISSIVE|authenticated|SELECT|true|',
    'migration|20251201000000|baseline',
    '',
  ].join('\n'));

  return { migrationsDir, outputDir, inventoryPath, catalogPath };
}

async function addMigration(paths, filename, contents, overrides = {}) {
  await writeFile(path.join(paths.migrationsDir, filename), contents);
  const inventory = JSON.parse(await readFile(paths.inventoryPath, 'utf8'));
  inventory.items.push({
    version: filename.match(/^\d{14}/)?.[0] ?? null,
    filename,
    sha256: sha256(contents),
    byteLength: Buffer.byteLength(contents),
    duplicateVersion: false,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
    ...overrides,
  });
  await writeFile(paths.inventoryPath, JSON.stringify(inventory));
}

async function run(paths) {
  await execFileAsync('node', [
    scriptPath,
    paths.inventoryPath,
    paths.catalogPath,
    paths.migrationsDir,
    paths.outputDir,
    '--target-sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '--dry-run-id=123',
    '--schema-evidence-run-id=456',
  ]);
  return JSON.parse(
    await readFile(path.join(paths.outputDir, 'migration-object-evidence.json'), 'utf8'),
  );
}

test('produces non-crediting object-state candidates and stays fail-closed', async () => {
  const paths = await fixture();
  const result = await run(paths);

  assert.equal(result.status, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(result.acceptedDecisions, 0);
  assert.deepEqual(result.safety, {
    databaseModified: false,
    migrationHistoryModified: false,
    productionPushAuthorized: false,
    automaticClassificationAllowed: false,
    candidateEvidenceIsApproval: false,
  });

  const byFile = new Map(result.items.map((item) => [item.filename, item]));
  assert.deepEqual(
    {
      state: byFile.get('20260101000000_present.sql').candidate.objectState,
      classification: byFile.get('20260101000000_present.sql').candidate.candidateClassification,
      confidence: byFile.get('20260101000000_present.sql').candidate.confidence,
    },
    { state: 'TARGET_STATE_PRESENT', classification: 'ALREADY_PRESENT_IN_SCHEMA', confidence: 'HIGH' },
  );
  assert.equal(byFile.get('20260101000100_pending.sql').candidate.objectState, 'TARGET_STATE_ABSENT');
  assert.equal(byFile.get('20260101000100_pending.sql').candidate.candidateClassification, 'PENDING_DEPLOYMENT');
  assert.equal(byFile.get('20260101000200_data_only.sql').candidate.objectState, 'UNPROVABLE');
  assert.equal(byFile.get('20260101000200_data_only.sql').candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(byFile.get('20260101000300_drop_legacy.sql').candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.deepEqual(result.counts, {
    inventoryItems: 4,
    targetStatePresent: 2,
    targetStateAbsent: 1,
    mixedOrPartial: 0,
    unprovable: 1,
    candidateAlreadyPresent: 2,
    candidatePendingDeployment: 1,
    candidateSplitReview: 1,
  });
  assert.ok(result.items.every((item) => /^[a-f0-9]{64}$/.test(item.objectProofDigest)));
  assert.ok(result.items.every((item) => item.candidate.humanDecisionRequired === true));
});

test('unsupported ALTER TABLE actions remain split-review evidence', async () => {
  const paths = await fixture();
  const filename = '20260101000400_alter_column_type.sql';
  await addMigration(
    paths,
    filename,
    'alter table public.alpha alter column label type varchar(100);',
  );
  const result = await run(paths);
  const item = result.items.find((entry) => entry.filename === filename);

  assert.equal(item.candidate.objectState, 'MIXED_OR_PARTIAL');
  assert.equal(item.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.ok(item.unresolved.some((entry) => (
    entry.reason === 'ALTER_TABLE_ACTION_NOT_PROVABLE_FROM_CATALOG'
  )));
});

test('REVOKE ALL expands to concrete table privileges and detects residual grants', async () => {
  const paths = await fixture();
  const filename = '20260101000500_revoke_all.sql';
  await addMigration(
    paths,
    filename,
    'revoke all on table public.alpha from authenticated;',
  );
  const catalog = await readFile(paths.catalogPath, 'utf8');
  await writeFile(
    paths.catalogPath,
    `${catalog}grant|public|alpha|authenticated|select|NO\n`,
  );
  const result = await run(paths);
  const item = result.items.find((entry) => entry.filename === filename);

  assert.equal(item.operations.length, 7);
  assert.ok(item.operations.some((entry) => (
    entry.key === 'public.alpha.authenticated.select'
    && entry.targetStateMatched === false
  )));
  assert.equal(item.candidate.objectState, 'MIXED_OR_PARTIAL');
  assert.equal(item.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
});

test('invalid migration filenames remain split-review candidates', async () => {
  const paths = await fixture();
  const inventory = JSON.parse(await readFile(paths.inventoryPath, 'utf8'));
  inventory.items[0].version = '20260101';
  inventory.items[0].classificationReasons.push('INVALID_LOCAL_FILENAME_OR_TIMESTAMP');
  await writeFile(paths.inventoryPath, JSON.stringify(inventory));

  const result = await run(paths);
  const item = result.items.find((entry) => entry.filename === '20260101000000_present.sql');
  assert.equal(item.candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.equal(item.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(item.candidate.humanDecisionRequired, true);
});

test('duplicate versions remain split-review candidates even when object state matches', async () => {
  const paths = await fixture();
  const inventory = JSON.parse(await readFile(paths.inventoryPath, 'utf8'));
  inventory.items[0].duplicateVersion = true;
  inventory.items[0].classificationReasons.push('DUPLICATE_VERSION');
  await writeFile(paths.inventoryPath, JSON.stringify(inventory));

  const result = await run(paths);
  const item = result.items.find((entry) => entry.filename === '20260101000000_present.sql');
  assert.equal(item.candidate.objectState, 'TARGET_STATE_PRESENT');
  assert.equal(item.candidate.candidateClassification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(item.candidate.humanDecisionRequired, true);
});

test('rejects stale inventory digests', async () => {
  const paths = await fixture();
  const inventory = JSON.parse(await readFile(paths.inventoryPath, 'utf8'));
  inventory.items[0].sha256 = '0'.repeat(64);
  await writeFile(paths.inventoryPath, JSON.stringify(inventory));

  await assert.rejects(execFileAsync('node', [
    scriptPath,
    paths.inventoryPath,
    paths.catalogPath,
    paths.migrationsDir,
    paths.outputDir,
  ]));
});
