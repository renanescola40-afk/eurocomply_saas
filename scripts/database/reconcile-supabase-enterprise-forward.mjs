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

const EXPECTED_CHANGE_SET = '2026-09-03-enterprise-step-up-onboarding-runtime-reconciliation-v30';
const V28_VERIFICATION_MIGRATION =
  '20260903090000_verify_v28_provider_ledger_reconciliation.sql';
const V29_STEP_UP_MIGRATION =
  '20260903100000_reconcile_enterprise_step_up_runtime.sql';
const V30_ONBOARDING_MIGRATION =
  '20260903114500_reconcile_onboarding_atomic_text_arrays.sql';
const EXPECTED_SELECTED = [
  V28_VERIFICATION_MIGRATION,
  V29_STEP_UP_MIGRATION,
  V30_ONBOARDING_MIGRATION,
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

function validateV28VerificationMigration(source) {
  requireMarkers(source, [
    '20260902193810',
    '20260902193849',
    '20260902202558',
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
  ], 'V28 provider-ledger verification migration');

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
  ], 'V28 provider-ledger verification migration');
}

function validateV29StepUpMigration(source) {
  requireMarkers(source, [
    "to_regclass('public.step_up_challenges')",
    'challenge_force_rls is distinct from true',
    "has_table_privilege('authenticated', 'public.step_up_challenges', 'SELECT')",
    "has_table_privilege('service_role', 'public.step_up_challenges', 'INSERT')",
    'create table if not exists public.step_up_tokens',
    'constraint step_up_tokens_short_lived',
    'create unique index if not exists step_up_tokens_active_nonce_idx',
    'create index if not exists step_up_tokens_scope_idx',
    'create index if not exists step_up_tokens_expiry_idx',
    'create or replace function public.touch_step_up_tokens_updated_at()',
    'set search_path = pg_catalog, public',
    'alter table public.step_up_tokens enable row level security',
    'alter table public.step_up_tokens force row level security',
    'revoke all on public.step_up_tokens from public, anon, authenticated',
    'grant all on public.step_up_tokens to service_role',
    'create table if not exists public.organization_security_settings',
    'constraint organization_security_settings_idp_policy_required',
    'create or replace function public.touch_organization_security_settings_updated_at()',
    'alter table public.organization_security_settings enable row level security',
    'alter table public.organization_security_settings force row level security',
    'revoke all on public.organization_security_settings from public, anon, authenticated',
    'grant all on public.organization_security_settings to service_role',
    "has_table_privilege('authenticated', 'public.step_up_tokens', 'SELECT')",
    "has_table_privilege('service_role', 'public.step_up_tokens', 'INSERT')",
    "has_table_privilege('authenticated', 'public.organization_security_settings', 'SELECT')",
    "has_table_privilege('service_role', 'public.organization_security_settings', 'UPDATE')",
    "select pg_notify('pgrst', 'reload schema')",
  ], 'V29 Enterprise Step-Up runtime migration');

  forbidMarkers(source, [
    'supabase_migrations.schema_migrations',
    'migration repair',
    'db push --include-all',
    'disable row level security',
    'grant all on public.step_up_tokens to anon',
    'grant all on public.step_up_tokens to authenticated',
    'grant all on public.organization_security_settings to anon',
    'grant all on public.organization_security_settings to authenticated',
    'drop table ',
    'truncate ',
  ], 'V29 Enterprise Step-Up runtime migration');
}

function validateV30OnboardingMigration(source) {
  requireMarkers(source, [
    "to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)')",
    "to_regprocedure('public.complete_onboarding_activation_atomic_reconciled(uuid,uuid,text,jsonb)')",
    "obligations_type not in ('jsonb', 'text[]')",
    'obligations_type <> next_actions_type',
    'v_obligations public.ai_systems.obligations%type;',
    'v_next_actions public.ai_systems.next_actions%type;',
    'from jsonb_populate_record(',
    'null::public.ai_systems',
    "jsonb_typeof(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) <> 'array'",
    "jsonb_typeof(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) <> 'array'",
    "where jsonb_typeof(obligation.value) <> 'string'",
    "where jsonb_typeof(next_action.value) <> 'string'",
    'obligations = v_obligations',
    'next_actions = v_next_actions',
    'where systems.organization_id = p_organization_id',
    'where runs.organization_id = p_organization_id',
    "v_actor_status is distinct from 'active'",
    "coalesce(v_actor_role, '') not in ('owner', 'admin')",
    'security definer',
    'set search_path = pg_catalog, public',
    'revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)',
    'from public, anon, authenticated, service_role',
    "select pg_notify('pgrst', 'reload schema')",
  ], 'V30 onboarding atomic runtime reconciliation');

  forbidMarkers(source, [
    'supabase_migrations.schema_migrations',
    'migration repair',
    'db push --include-all',
    'disable row level security',
    'alter table public.ai_systems',
    'grant execute on function public.complete_onboarding_activation_atomic_reconciled',
    'grant all on public.ai_systems to anon',
    'grant all on public.ai_systems to authenticated',
    'drop table ',
    'truncate ',
  ], 'V30 onboarding atomic runtime reconciliation');
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

  const v28Source = readFileSync(
    join(ROOT, 'supabase', 'migrations', V28_VERIFICATION_MIGRATION),
    'utf8',
  );
  validateV28VerificationMigration(v28Source);

  const v29Source = readFileSync(
    join(ROOT, 'supabase', 'migrations', V29_STEP_UP_MIGRATION),
    'utf8',
  );
  validateV29StepUpMigration(v29Source);

  const v30Source = readFileSync(
    join(ROOT, 'supabase', 'migrations', V30_ONBOARDING_MIGRATION),
    'utf8',
  );
  validateV30OnboardingMigration(v30Source);

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
