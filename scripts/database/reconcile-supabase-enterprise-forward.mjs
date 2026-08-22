#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'config', 'supabase-forward-reconciliation.json');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const DEFAULT_REPORT_PATH = join(
  ROOT,
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-forward-reconciliation-evidence.json',
);

const EXPECTED_SCHEMA = 'risck-comply.supabase-forward-reconciliation-config.v1';
const EXPECTED_CHANGE_SET = '2026-08-22-enterprise-data-plane-closure-v19';
const EVIDENCE_VAULT_MIGRATION = '20260822123626_v19_reconcile_enterprise_evidence_vault.sql';
const COMMERCIAL_QUOTA_MIGRATION = '20260822120617_atomic_vendor_risk_quota_mutations.sql';
const EXPECTED_SELECTED = [
  '20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql',
  '20260822123540_v19_reconcile_step_up_challenges_runtime.sql',
  '20260822123542_v19_reconcile_subscription_schema_defaults.sql',
  '20260822123544_v19_reconcile_controlled_document_storage.sql',
  '20260822123546_v19_force_tasks_rls.sql',
  '20260822123548_v19_reconcile_enterprise_break_glass_governance.sql',
  '20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql',
  '20260822123552_v19_reconcile_enterprise_integrations_scim.sql',
  '20260822123554_v19_harden_scim_identity_connection_delete_boundary.sql',
  '20260822123556_v19_bridge_enterprise_contract_mode_compatibility.sql',
  '20260822123558_v19_reconcile_enterprise_billing_lifecycle.sql',
  '20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql',
  '20260822123602_v19_reconcile_enterprise_contract_control_rpcs.sql',
  '20260822123604_v19_reconcile_enterprise_core_active_runtime.sql',
  '20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql',
  '20260822123608_v19_reconcile_new_organization_compatibility_envelope.sql',
  '20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql',
  '20260822123612_v19_harden_enterprise_invitation_actor_boundary.sql',
  '20260822123614_v19_preserve_completed_onboarding_state.sql',
  '20260822123616_v19_reconcile_active_onboarding_runtime.sql',
  '20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql',
  '20260822123620_v19_guard_compliance_task_browser_mutations.sql',
  '20260822123622_v19_reconcile_gap_remediation_persistence.sql',
  '20260822123624_v19_harden_gap_personal_task_write_boundary.sql',
  EVIDENCE_VAULT_MIGRATION,
];

const TRUTH_BOUNDARY = {
  automaticClassification: false,
  productionWriteAuthorizedByConfig: false,
  migrationHistoryRepairAllowed: false,
  unrestrictedDbPushAllowed: false,
  onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
};

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${path}: ${error instanceof Error ? error.message : String(error)}`);
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

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual)) fail(`${label} must be an array`);
  if (actual.length !== expected.length) {
    fail(`${label} length drifted: expected ${expected.length}, received ${actual.length}`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      fail(`${label} drift at position ${index + 1}: expected ${expected[index]}, received ${actual[index]}`);
    }
  }
}

function assertTruthBoundary(actual) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    fail('truthBoundary must be an object');
  }
  for (const [key, expectedValue] of Object.entries(TRUTH_BOUNDARY)) {
    if (actual[key] !== expectedValue) {
      fail(`truthBoundary.${key} drifted: expected ${expectedValue}, received ${String(actual[key])}`);
    }
  }
}

function validateMigrationFilename(filename) {
  const match = filename.match(/^(\d{14})_[a-z0-9][a-z0-9_]*\.sql$/);
  if (!match) fail(`Selected migration filename is non-canonical: ${filename}`);
  return match[1];
}

function validateEvidenceVaultMigration(source) {
  const requiredMarkers = [
    'alter column organization_id set not null',
    'alter table public.evidence_items force row level security',
    'alter table public.evidence_item_audit_events force row level security',
    'app_private.enforce_evidence_item_invariants()',
    'Evidence attachment metadata is write-once',
    'Soft-deleted Evidence Vault records are immutable',
    'app_private.evidence_storage_evidence_id(object_name text)',
    'rls_compliance_evidence_objects_select_organization',
    'rls_compliance_evidence_objects_insert_organization',
    'Evidence Vault records are append-audited and must be soft-deleted',
  ];
  for (const marker of requiredMarkers) {
    if (!source.includes(marker)) fail(`Evidence Vault migration lost required marker: ${marker}`);
  }
  for (const forbiddenMarker of [
    'create policy "rls_compliance_evidence_objects_update_organization"',
    'create policy "rls_compliance_evidence_objects_delete_organization"',
    'grant select, insert, update, delete on table public.evidence_items to authenticated',
  ]) {
    if (source.includes(forbiddenMarker)) fail(`Evidence Vault migration reopened forbidden browser boundary: ${forbiddenMarker}`);
  }
}

function validateCommercialQuotaMutation(source) {
  const requiredMarkers = [
    'create or replace function public.mutate_commercial_resource_with_audit_atomic(',
    'security definer',
    'set search_path = pg_catalog, public',
    'pg_advisory_xact_lock(hashtext(p_organization_id::text))',
    "p_resource_type not in ('vendor', 'risk')",
    "p_operation not in ('create', 'delete')",
    "return query select 'quota_exceeded'::text",
    'insert into public.audit_logs',
    'insert into public.audit_events',
    'revoke all on function public.mutate_commercial_resource_with_audit_atomic(',
    'from public, anon, authenticated',
    'grant execute on function public.mutate_commercial_resource_with_audit_atomic(',
    'to service_role',
  ];
  for (const marker of requiredMarkers) {
    if (!source.includes(marker)) fail(`Commercial quota migration lost required marker: ${marker}`);
  }
  for (const forbiddenMarker of [
    'grant execute on function public.mutate_commercial_resource_with_audit_atomic(\n  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,\n  timestamptz, text, text, text\n) to authenticated',
    'grant execute on function public.mutate_commercial_resource_with_audit_atomic(\n  text, text, uuid, uuid, uuid, jsonb, integer, integer, uuid, jsonb,\n  timestamptz, text, text, text\n) to anon',
  ]) {
    if (source.includes(forbiddenMarker)) fail(`Commercial quota migration reopened forbidden browser execution: ${forbiddenMarker}`);
  }
}

function main() {
  if (!existsSync(CONFIG_PATH)) fail(`Missing bounded reconciliation config: ${CONFIG_PATH}`);
  const config = readJson(CONFIG_PATH);
  if (config.schema !== EXPECTED_SCHEMA) fail(`Unexpected reconciliation schema: ${String(config.schema)}`);
  if (config.changeSet !== EXPECTED_CHANGE_SET) fail(`Unexpected reconciliation changeSet: ${String(config.changeSet)}`);
  assertTruthBoundary(config.truthBoundary);

  const selected = (config.migrations ?? []).map((record) => record?.filename);
  assertExactArray(selected, EXPECTED_SELECTED, 'bounded selected migration set');
  if (new Set(selected).size !== selected.length) fail('bounded selected migration set contains duplicate filenames');

  let previousTimestamp = null;
  const records = selected.map((filename, index) => {
    const timestamp = validateMigrationFilename(filename);
    if (previousTimestamp !== null && timestamp <= previousTimestamp) {
      fail(`bounded migration order is not strictly increasing at ${filename}`);
    }
    previousTimestamp = timestamp;

    const path = join(MIGRATIONS_DIR, filename);
    if (!existsSync(path)) fail(`Selected migration is missing: ${filename}`);
    const bytes = readFileSync(path);
    const source = bytes.toString('utf8');
    if (filename === EVIDENCE_VAULT_MIGRATION) validateEvidenceVaultMigration(source);
    if (filename === COMMERCIAL_QUOTA_MIGRATION) validateCommercialQuotaMutation(source);

    return {
      position: index + 1,
      filename,
      timestamp,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });

  const selectedSetSha256 = sha256(
    Buffer.from(records.map((record) => `${record.position}:${record.filename}:${record.sha256}`).join('\n'), 'utf8'),
  );
  const gitSha = currentGitSha();
  const expectedHeadSha = String(process.env.EXPECTED_HEAD_SHA ?? '').trim();

  if (expectedHeadSha) {
    if (!/^[a-f0-9]{40}$/.test(expectedHeadSha)) fail('EXPECTED_HEAD_SHA must be a full 40-character Git SHA');
    if (!gitSha) fail('Unable to resolve git HEAD while EXPECTED_HEAD_SHA is required');
    if (gitSha !== expectedHeadSha) fail(`Exact-SHA mismatch: expected ${expectedHeadSha}, assessed ${gitSha}`);
  }

  const report = {
    schema: 'risck-comply.supabase-forward-reconciliation-evidence.v1',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
    gitSha,
    expectedHeadSha: expectedHeadSha || null,
    exactShaVerified: Boolean(expectedHeadSha && gitSha === expectedHeadSha),
    changeSet: EXPECTED_CHANGE_SET,
    selectedCount: records.length,
    selectedSetSha256,
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
      `selected_count=${records.length}\nselected_set_sha256=${selectedSetSha256}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }

  process.stdout.write(`Bounded Supabase forward reconciliation verified: ${records.length} migrations\n`);
  process.stdout.write(`Selected-set SHA-256: ${selectedSetSha256}\n`);
  process.stdout.write('Production write authorization: false\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
