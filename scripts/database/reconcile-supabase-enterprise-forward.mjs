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

const EXPECTED_CHANGE_SET = '2026-09-02-provider-ledger-verification-reconciliation-v27';
const V27_VERIFICATION_MIGRATION =
  '20260902195000_verify_v27_provider_ledger_reconciliation.sql';
const EXPECTED_SELECTED = [V27_VERIFICATION_MIGRATION];

function fail(message) {
  throw new Error(message);
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    if (!source.includes(marker)) fail(`${label} lost required marker: ${marker}`);
  }
}

function forbidMarkers(source, markers, label) {
  const normalized = source.toLowerCase();
  for (const marker of markers) {
    if (normalized.includes(marker.toLowerCase())) fail(`${label} reopened forbidden boundary: ${marker}`);
  }
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

function validateV27VerificationMigration(source) {
  requireMarkers(source, [
    '20260902193810',
    '20260902193849',
    "pg_get_functiondef('app_private.resolve_commercial_plan(uuid)'::regprocedure)",
    'order by source.priority desc, source.id asc',
    "source.source_kind = ''signed_contract''",
    'event.livemode = true',
    "event.status = ''processed''",
    "has_function_privilege('public', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')",
    "has_function_privilege('service_role', 'app_private.resolve_commercial_plan(uuid)', 'EXECUTE')",
    "'supabase_provider_id'",
    "'default_role'",
    "'default_seat_type'",
    "'auto_provision'",
    "'last_login_at'",
    "conname = 'enterprise_identity_default_role_allowed'",
    "conname = 'enterprise_identity_default_seat_allowed'",
    "to_regclass('public.enterprise_identity_supabase_provider_unique')",
    "to_regclass('public.enterprise_identity_domain_active_idx')",
    "to_regprocedure('public.resolve_enterprise_sso_binding(uuid,text)')",
    "to_regprocedure('public.record_enterprise_sso_login(uuid,uuid,text)')",
    "to_regprocedure('public.upsert_enterprise_sso_connection_atomic(uuid,uuid,uuid,text,text,text,text,text,boolean,boolean,uuid)')",
    "'search_path=pg_catalog, public'",
    'p.prosecdef is not true',
    'c.relrowsecurity, c.relforcerowsecurity',
    'identity_rls is distinct from true',
    'identity_force_rls is distinct from true',
  ], 'V27 provider-ledger verification migration');

  forbidMarkers(source, [
    'alter table ',
    'create or replace function',
    'create policy ',
    'alter policy ',
    'drop policy ',
    'grant execute',
    'revoke all',
    'insert into ',
    'update public.',
    'delete from ',
    'truncate ',
    'drop table ',
  ], 'V27 provider-ledger verification migration');
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.changeSet !== EXPECTED_CHANGE_SET) {
    fail(`Unexpected reconciliation changeSet: ${String(config.changeSet)}`);
  }

  const selected = (config.migrations ?? []).map((record) => record?.filename);
  if (JSON.stringify(selected) !== JSON.stringify(EXPECTED_SELECTED)) {
    fail(`bounded selected migration set drifted: expected ${EXPECTED_SELECTED.join(', ')}`);
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

  const manifest = await compileForwardReconciliationManifest({
    config,
    rootDir: ROOT,
    subjectSha: expectedHeadSha || gitSha,
  });

  const source = readFileSync(
    join(ROOT, 'supabase', 'migrations', V27_VERIFICATION_MIGRATION),
    'utf8',
  );
  validateV27VerificationMigration(source);

  const records = manifest.migrations.map((migration, index) => ({
    position: index + 1,
    filename: migration.filename,
    timestamp: migration.version,
    bytes: migration.sizeBytes,
    sha256: migration.sha256,
  }));

  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v1',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    selectedCount: records.length,
    selectedSetSha256: manifest.selectionDigest.replace(/^sha256:/, ''),
    productionWriteAuthorized: false,
    migrationHistoryRepairAuthorized: false,
    automaticClassificationPerformed: false,
    humanDecisionRequired: true,
    records,
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
      `selected_count=${records.length}\nselected_set_sha256=${report.selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write(`Bounded Supabase forward reconciliation verified: ${records.length} migrations\n`);
  process.stdout.write(`Selected-set SHA-256: ${report.selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
