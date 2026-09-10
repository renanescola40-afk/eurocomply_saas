#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { compileForwardReconciliationManifest } from '../supabase/forward-reconciliation-control-plane.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'config', 'supabase-forward-reconciliation.json');
const DEFAULT_REPORT_PATH = join(
  ROOT,
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-forward-reconciliation-evidence.json',
);

const EXPECTED_CHANGE_SET = '2026-09-10-production-runtime-contract-v43';
const SOURCE_CHANGE_SET = '2026-09-09-gdpr-rights-lifecycle-v42';
const VERIFIED_PRODUCTION_LEDGER_HEAD = '20260909232229';
const FRIA_MIGRATION = '20260910113000_reconcile_fria_operational_runtime_v43.sql';
const ARTICLE5_MIGRATION = '20260910114000_reconcile_prohibited_practices_runtime_v43.sql';
const DSR_MIGRATION = '20260910115000_atomic_data_subject_request_lifecycle_audit_v43.sql';
const EXPECTED_MIGRATIONS = [FRIA_MIGRATION, ARTICLE5_MIGRATION, DSR_MIGRATION];

function fail(message) {
  throw new Error(message);
}

function currentGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function assertTruthBoundary(config) {
  const truth = config?.truthBoundary ?? {};
  if (truth.automaticClassification !== false) fail('automaticClassification must remain false');
  if (truth.productionWriteAuthorizedByConfig !== false) fail('productionWriteAuthorizedByConfig must remain false');
  if (truth.migrationHistoryRepairAllowed !== false) fail('migrationHistoryRepairAllowed must remain false');
  if (truth.unrestrictedDbPushAllowed !== false) fail('unrestrictedDbPushAllowed must remain false');
  if (truth.onlyListedForwardMigrationsMayBeRehearsedOrRequested !== true) {
    fail('onlyListedForwardMigrationsMayBeRehearsedOrRequested must remain true');
  }
}

function readSelectedMigration(filename) {
  return readFileSync(join(ROOT, 'supabase', 'migrations', filename), 'utf8');
}

function assertForwardOrdering() {
  let previous = VERIFIED_PRODUCTION_LEDGER_HEAD;
  for (const filename of EXPECTED_MIGRATIONS) {
    const version = filename.slice(0, 14);
    if (version <= previous) {
      fail(`${filename} must sort strictly after ${previous}`);
    }
    previous = version;
  }
}

function assertNoDestructiveReplacement(filename, sql) {
  if (/\b(drop\s+table|truncate\s+table)\b/i.test(sql)) {
    fail(`${filename} must not destructively replace Production relations`);
  }
  if (/migration\s+repair|schema_migrations\s*\(/i.test(sql)) {
    fail(`${filename} must not repair or synthesize migration history`);
  }
}

function verifyV43RuntimeContracts() {
  const fria = readSelectedMigration(FRIA_MIGRATION);
  const article5 = readSelectedMigration(ARTICLE5_MIGRATION);
  const dsr = readSelectedMigration(DSR_MIGRATION);

  for (const [filename, sql] of [
    [FRIA_MIGRATION, fria],
    [ARTICLE5_MIGRATION, article5],
    [DSR_MIGRATION, dsr],
  ]) {
    assertNoDestructiveReplacement(filename, sql);
  }

  for (const marker of [
    'create_fria_assessment_atomic',
    'approve_fria_assessment_atomic',
    'compensate_fria_approval_audit_failure',
    'enforce_fria_member_scope',
    'force row level security',
    'to service_role',
  ]) {
    if (!fria.toLowerCase().includes(marker.toLowerCase())) {
      fail(`V43 FRIA runtime marker missing: ${marker}`);
    }
  }

  for (const marker of [
    'create table if not exists public.ai_prohibited_practice_reviews',
    'create table if not exists public.ai_prohibited_practice_signal_assessments',
    'create table if not exists public.ai_prohibited_practice_exception_claims',
    'create table if not exists public.ai_prohibited_practice_evidence',
    'create table if not exists public.ai_prohibited_practice_decisions',
    'create_prohibited_practices_review_atomic',
    'approve_prohibited_practices_review_atomic',
    'app_private.is_org_member(organization_id)',
    'force row level security',
    'from public, anon, authenticated',
  ]) {
    if (!article5.toLowerCase().includes(marker.toLowerCase())) {
      fail(`V43 Article 5 runtime marker missing: ${marker}`);
    }
  }

  for (const marker of [
    'update_data_subject_request_with_audit_atomic',
    'append_audit_event_chained',
    'set search_path = pg_catalog',
    'from public, anon, authenticated',
    'to service_role',
  ]) {
    if (!dsr.toLowerCase().includes(marker.toLowerCase())) {
      fail(`V43 GDPR atomic lifecycle marker missing: ${marker}`);
    }
  }
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.changeSet !== EXPECTED_CHANGE_SET) {
    fail(`Unexpected reconciliation changeSet: ${String(config.changeSet)}`);
  }
  if (config.sourceChangeSet !== SOURCE_CHANGE_SET) {
    fail(`Unexpected reconciliation sourceChangeSet: ${String(config.sourceChangeSet)}`);
  }
  assertTruthBoundary(config);

  const selected = (config.migrations ?? []).map((record) => record?.filename);
  if (JSON.stringify(selected) !== JSON.stringify(EXPECTED_MIGRATIONS)) {
    fail(`bounded selected migration set drifted: expected ${EXPECTED_MIGRATIONS.join(', ')}`);
  }

  assertForwardOrdering();
  verifyV43RuntimeContracts();

  const gitSha = currentGitSha();
  if (!gitSha || !/^[a-f0-9]{40}$/.test(gitSha)) fail('Unable to resolve an exact git HEAD');

  const expectedHeadSha = String(process.env.EXPECTED_HEAD_SHA ?? '').trim();
  if (expectedHeadSha) {
    if (!/^[a-f0-9]{40}$/.test(expectedHeadSha)) {
      fail('EXPECTED_HEAD_SHA must be a full 40-character Git SHA');
    }
    if (gitSha !== expectedHeadSha) {
      fail(`Exact-SHA mismatch: expected ${expectedHeadSha}, assessed ${gitSha}`);
    }
  }

  const manifest = await compileForwardReconciliationManifest({
    config,
    rootDir: ROOT,
    subjectSha: expectedHeadSha || gitSha,
  });

  if (
    manifest.migrations.length !== EXPECTED_MIGRATIONS.length
    || JSON.stringify(manifest.migrations.map((migration) => migration.filename)) !== JSON.stringify(EXPECTED_MIGRATIONS)
  ) {
    fail('V43 manifest does not contain exactly the reviewed runtime reconciliation set');
  }

  const lineageKinds = [
    'reviewed-v43-fria-runtime-reconciliation',
    'reviewed-v43-article5-runtime-reconciliation',
    'reviewed-v43-gdpr-atomic-lifecycle-reforward',
  ];

  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v2',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    sourceChangeSet: SOURCE_CHANGE_SET,
    selectedCount: manifest.migrations.length,
    selectedSetSha256: manifest.selectionDigest.replace(/^sha256:/, ''),
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    unrestrictedDbPushAuthorized: false,
    automaticClassificationPerformed: false,
    humanDecisionRequired: true,
    productionLedgerHeadBeforeSelection: VERIFIED_PRODUCTION_LEDGER_HEAD,
    records: manifest.migrations.map((migration, index) => ({
      position: index + 1,
      filename: migration.filename,
      timestamp: migration.version,
      bytes: migration.sizeBytes,
      sha256: migration.sha256,
      lineageKind: lineageKinds[index],
    })),
  };

  const reportPath = String(process.env.SUPABASE_FORWARD_RECONCILIATION_REPORT ?? '').trim()
    || (process.argv.includes('--write') ? DEFAULT_REPORT_PATH : '');
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `selected_count=${manifest.migrations.length}\nselected_set_sha256=${report.selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write(`Bounded Supabase V43 forward reconciliation verified: ${manifest.migrations.length} migrations\n`);
  process.stdout.write(`Source change set: ${SOURCE_CHANGE_SET}\n`);
  process.stdout.write(`Production ledger head before selection: ${VERIFIED_PRODUCTION_LEDGER_HEAD}\n`);
  process.stdout.write(`Selected-set SHA-256: ${report.selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
