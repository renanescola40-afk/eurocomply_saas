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

const EXPECTED_CHANGE_SET = '2026-09-09-gdpr-rights-lifecycle-v42';
const SOURCE_CHANGE_SET = '2026-09-09-supabase-advisor-rpc-hardening-v41';
const VERIFIED_PRODUCTION_LEDGER_HEAD = '20260909006900';
const V42_DSR_MIGRATION = '20260909143000_harden_data_subject_request_lifecycle.sql';

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

function verifyV42MigrationBoundary() {
  const path = join(ROOT, 'supabase', 'migrations', V42_DSR_MIGRATION);
  const sql = readFileSync(path, 'utf8');
  const version = V42_DSR_MIGRATION.slice(0, 14);

  if (version <= VERIFIED_PRODUCTION_LEDGER_HEAD) {
    fail(`V42 migration is not strictly forward of Production head ${VERIFIED_PRODUCTION_LEDGER_HEAD}`);
  }

  for (const marker of [
    "to_regclass('public.data_subject_requests')",
    'alter column due_at drop default',
    'force row level security',
    'revoke insert, update, delete on table public.data_subject_requests from anon, authenticated',
    "'portability'",
    "'consent_withdrawal'",
    'initial_due_at',
    'identity_verification_state',
    'role_route',
    'extension_reason',
    'decision_reason',
    'evidence_refs',
  ]) {
    if (!sql.toLowerCase().includes(marker.toLowerCase())) {
      fail(`V42 GDPR lifecycle marker missing: ${marker}`);
    }
  }

  if (sql.includes("interval '30 days'")) {
    fail('V42 must not restore a fixed 30-day DSR deadline default');
  }
  if (/create\s+table\s+(if\s+not\s+exists\s+)?public\.data_subject_requests/i.test(sql)) {
    fail('V42 must evolve the canonical data_subject_requests table, not create a competitor');
  }
  if (/\b(drop\s+table|truncate\s+table)\s+public\.data_subject_requests\b/i.test(sql)) {
    fail('V42 must not destructively replace the canonical DSR table');
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
  if (JSON.stringify(selected) !== JSON.stringify([V42_DSR_MIGRATION])) {
    fail(`bounded selected migration set drifted: expected ${V42_DSR_MIGRATION}`);
  }

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

  verifyV42MigrationBoundary();

  const manifest = await compileForwardReconciliationManifest({
    config,
    rootDir: ROOT,
    subjectSha: expectedHeadSha || gitSha,
  });

  if (manifest.migrations.length !== 1 || manifest.migrations[0]?.filename !== V42_DSR_MIGRATION) {
    fail('V42 manifest does not contain exactly the reviewed GDPR lifecycle migration');
  }

  const migration = manifest.migrations[0];
  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v2',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    sourceChangeSet: SOURCE_CHANGE_SET,
    selectedCount: 1,
    selectedSetSha256: manifest.selectionDigest.replace(/^sha256:/, ''),
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    unrestrictedDbPushAuthorized: false,
    automaticClassificationPerformed: false,
    humanDecisionRequired: true,
    productionLedgerHeadBeforeSelection: VERIFIED_PRODUCTION_LEDGER_HEAD,
    v41AlreadyPresentInProduction: true,
    records: [{
      position: 1,
      filename: migration.filename,
      timestamp: migration.version,
      bytes: migration.sizeBytes,
      sha256: migration.sha256,
      lineageKind: 'reviewed-v42-gdpr-rights-lifecycle',
      sourceFilename: null,
    }],
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
      `selected_count=1\nselected_set_sha256=${report.selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write('Bounded Supabase forward reconciliation verified: 1 migration\n');
  process.stdout.write(`Source change set: ${SOURCE_CHANGE_SET}\n`);
  process.stdout.write(`Production ledger head before selection: ${VERIFIED_PRODUCTION_LEDGER_HEAD}\n`);
  process.stdout.write(`Reviewed V42 GDPR lifecycle migration: ${V42_DSR_MIGRATION}\n`);
  process.stdout.write(`Selected-set SHA-256: ${report.selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
