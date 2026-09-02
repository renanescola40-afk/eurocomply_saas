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

const EXPECTED_CHANGE_SET = '2026-09-02-enterprise-sso-production-runtime-reconciliation-v26';
const DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION =
  '20260831130000_reconcile_deterministic_commercial_contract_source_precedence.sql';
const ENTERPRISE_SSO_RUNTIME_MIGRATION =
  '20260902083000_reconcile_enterprise_sso_production_runtime.sql';
const EXPECTED_SELECTED = [
  DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION,
  ENTERPRISE_SSO_RUNTIME_MIGRATION,
];

function fail(message) {
  throw new Error(message);
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    if (!source.includes(marker)) fail(`${label} lost required marker: ${marker}`);
  }
}

function forbidMarkers(source, markers, label) {
  for (const marker of markers) {
    if (source.includes(marker)) fail(`${label} reopened forbidden boundary: ${marker}`);
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

function validateDeterministicCommercialSourceMigration(source) {
  requireMarkers(source, [
    'create or replace function app_private.resolve_commercial_plan',
    'order by source.priority desc, source.id asc',
    "source.source_kind = 'signed_contract'",
    "snapshot.status = 'applied'",
    'event.livemode = true',
    "event.status = 'processed'",
    'revoke all on function app_private.resolve_commercial_plan(uuid) from public, anon, authenticated',
    'grant execute on function app_private.resolve_commercial_plan(uuid) to service_role',
    'commercial authority ordering is not deterministic',
  ], 'Deterministic commercial source migration');
  forbidMarkers(source, [
    "in ('active','trialing')",
    "source_kind = 'manual_override'",
    'grant execute on function app_private.resolve_commercial_plan(uuid) to authenticated',
    'grant execute on function app_private.resolve_commercial_plan(uuid) to anon',
  ], 'Deterministic commercial source migration');
}

function validateEnterpriseSsoRuntimeMigration(source) {
  requireMarkers(source, [
    'add column if not exists supabase_provider_id uuid',
    'add column if not exists default_role text',
    'add column if not exists default_seat_type text',
    'add column if not exists auto_provision boolean',
    'add column if not exists last_login_at timestamptz',
    'create or replace function public.resolve_enterprise_sso_binding',
    'create or replace function public.record_enterprise_sso_login',
    'create or replace function public.upsert_enterprise_sso_connection_atomic',
    'join public.organization_entitlements entitlement',
    "contract.contract_mode = 'negotiated'",
    "contract.status = 'active'",
    'entitlement.sso_enabled = true',
    'revoke all on function public.resolve_enterprise_sso_binding(uuid, text)',
    'grant execute on function public.resolve_enterprise_sso_binding(uuid, text)',
    'to service_role;',
    'enterprise SSO binding resolver privilege boundary is invalid',
  ], 'Enterprise SSO Production runtime migration');
  forbidMarkers(source, [
    'resolve_organization_entitlements_v3',
    'grant execute on function public.resolve_enterprise_sso_binding(uuid, text) to authenticated',
    'grant execute on function public.resolve_enterprise_sso_binding(uuid, text) to anon',
  ], 'Enterprise SSO Production runtime migration');
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

  const sources = new Map(
    selected.map((filename) => [
      filename,
      readFileSync(join(ROOT, 'supabase', 'migrations', filename), 'utf8'),
    ]),
  );
  validateDeterministicCommercialSourceMigration(
    sources.get(DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION),
  );
  validateEnterpriseSsoRuntimeMigration(
    sources.get(ENTERPRISE_SSO_RUNTIME_MIGRATION),
  );

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
