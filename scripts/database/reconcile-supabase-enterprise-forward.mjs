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
const EXPECTED_CHANGE_SET = '2026-08-31-deterministic-commercial-source-precedence-ledger-reconciliation-v25';
const DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION =
  '20260831130000_reconcile_deterministic_commercial_contract_source_precedence.sql';
const EVIDENCE_VAULT_MIGRATION = '20260822123626_v19_reconcile_enterprise_evidence_vault.sql';
const PAYMENT_FIRST_CORE_MIGRATION = '20260823123000_payment_first_commercial_data_plane.sql';
const PAYMENT_FIRST_GAP_STORAGE_MIGRATION = '20260823131500_payment_first_gap_analysis_and_storage.sql';
const TRUSTED_ACCESS_PREPARE_MIGRATION = '20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql';
const TRUSTED_ACCESS_RUNTIME_MIGRATION = '20260824190000_reconcile_enterprise_trusted_access_runtime.sql';
const TRUSTED_ACCESS_FINALIZE_MIGRATION = '20260824190100_finalize_enterprise_trusted_access_operation_contract.sql';
const TRUSTED_ACCESS_HARDEN_MIGRATION = '20260824190200_harden_enterprise_trusted_access_runtime_contract.sql';
const DOCUMENT_COMMERCIAL_QUOTA_MIGRATION = '20260825092500_atomic_document_commercial_quota.sql';
const ACTIVE_MEMBERSHIP_RLS_MIGRATION = '20260825171500_harden_active_membership_rls_authority.sql';
const COMMERCIAL_QUOTA_MIGRATION = '20260822120617_atomic_vendor_risk_quota_mutations.sql';
const EXPECTED_SELECTED = [DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION];

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

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\r\n]*/g, '');
}

function validateEvidenceVaultMigration(source) {
  requireMarkers(source, [
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
  ], 'Evidence Vault migration');
  forbidMarkers(source, [
    'create policy "rls_compliance_evidence_objects_update_organization"',
    'create policy "rls_compliance_evidence_objects_delete_organization"',
    'grant select, insert, update, delete on table public.evidence_items to authenticated',
  ], 'Evidence Vault migration');
}

function validatePaymentFirstCoreMigration(source) {
  requireMarkers(source, [
    'app_private.has_commercial_authority',
    "source.source_kind = 'signed_contract'",
    'event.livemode = true',
    "event.status = 'processed'",
    "lower(coalesce(subscription.status, '')) = 'active'",
    'as restrictive for all to authenticated',
    'using (app_private.has_commercial_authority(organization_id))',
    "array['ai_tools', 'compliance_documents']",
    'revoke all on table public.regulatory_updates from public, anon, authenticated',
    'legacy/global paid-product client grants survived',
  ], 'Payment-first commercial authority migration');
  forbidMarkers(source, [
    "in ('active','trialing')",
    "source_kind = 'manual_override'",
  ], 'Payment-first commercial authority migration');
}

function validatePaymentFirstGapStorageMigration(source) {
  requireMarkers(source, [
    'payment_first_gap_assessments_authority',
    'payment_first_gap_answers_authority',
    'payment_first_compliance_findings_authority',
    'app_private.has_commercial_authority(organization_id)',
    'app_private.has_commercial_authority(ga.organization_id)',
    'revoke all on table public.compliance_evidence from public, anon, authenticated',
    'rls_compliance_evidence_objects_select_organization',
    'rls_compliance_evidence_objects_insert_organization',
    'app_private.has_commercial_authority(e.organization_id)',
    'Evidence Vault Storage policies are not payment-first',
  ], 'Payment-first Gap/Storage migration');
}

function validateTrustedAccessPrepareMigration(source) {
  requireMarkers(source, [
    'success_rate*100',
    'oldest_pending_age_seconds',
    'dead_letter_count',
    'alter column title drop not null',
    'drop policy if exists enterprise_access_operations_authenticated_select_deny',
  ], 'Trusted Access compatibility migration');
}

function validateTrustedAccessRuntimeMigration(source) {
  requireMarkers(source, [
    'enterprise_access_operations',
    'enterprise_access_runtime_snapshots',
    'enterprise_access_runtime_alerts',
    'enterprise_access_export_jobs',
    "'enterprise-access-exports'",
    'reserve_organization_seat_idempotent_atomic',
    'enterprise_seat_contention_events',
    'browser roles retain trusted access control-plane privileges',
  ], 'Trusted Access runtime migration');
  forbidMarkers(stripSqlComments(source), [
    'enterprise_access_operation_runs',
    'v_contract.seat_limit',
  ], 'Trusted Access runtime migration');
}

function validateTrustedAccessFinalizeMigration(source) {
  requireMarkers(source, [
    'persist_enterprise_group_access_reconciliation',
    'membership_tenant_mismatch',
    'public.digest',
    'deliberately non-authoritative',
  ], 'Trusted Access finalization migration');
}

function validateTrustedAccessHardenMigration(source) {
  requireMarkers(source, [
    'add column if not exists source_group_id uuid',
    'add column if not exists department_key text',
    "when v_pending > 0 and v_failed = 0 then 'pending'",
    "v_operation.status in ('retry', 'processing')",
    "'seat-contention:%s:%s:%s'",
    "'idempotencyScope', 'correlation+membership+seat_type'",
    'browser execution survived Trusted Access hardening',
  ], 'Trusted Access hardening migration');
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

function validateDocumentCommercialQuotaMigration(source) {
  requireMarkers(source, [
    'app_private.resolve_commercial_plan',
    'app_private.enforce_document_commercial_quota()',
    'app_private.has_commercial_authority(new.organization_id)',
    "lower(coalesce(subscription.status, '')) = 'active'",
    'event.livemode = true',
    "event.status = 'processed'",
    'pg_advisory_xact_lock(hashtext(new.organization_id::text))',
    'from public.documents document',
    "when 'starter' then 100",
    "when 'professional' then 1000",
    "when 'business' then 10000",
    "when 'enterprise' then null",
    "message = 'document_quota_exceeded'",
    'before insert on public.documents',
    'revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated',
  ], 'Document commercial quota migration');
  forbidMarkers(source, [
    "when 'free' then 'starter'",
    "in ('active','trialing')",
    'grant execute on function app_private.enforce_document_commercial_quota() to authenticated',
    'grant execute on function app_private.enforce_document_commercial_quota() to anon',
  ], 'Document commercial quota migration');
}

function validateActiveMembershipRlsMigration(source) {
  requireMarkers(source, [
    'create or replace function app_private.is_org_member',
    'create or replace function app_private.has_org_role',
    "lower(coalesce(om.status, '')) = 'active'",
    'public.current_legacy_user_id()',
    'public.current_clerk_user_id()',
    'lower(om.role) = any(allowed_roles)',
    'organization_members_status_check',
    'canonical private RLS helpers are not active-membership aware',
    'revoke all on function app_private.is_org_member(uuid) from public, anon',
    'grant execute on function app_private.is_org_member(uuid) to authenticated, service_role',
  ], 'Active membership RLS migration');

  const canonicalSource = stripSqlComments(source);
  for (const helperName of ['app_private.is_org_member', 'app_private.has_org_role']) {
    const startMarker = `create or replace function ${helperName}`;
    const start = canonicalSource.indexOf(startMarker);
    const bodyStart = canonicalSource.indexOf('as $$', start);
    const end = canonicalSource.indexOf('$$;', bodyStart + 5);
    if (start < 0 || bodyStart < 0 || end < 0) {
      fail(`Active membership RLS migration cannot isolate canonical helper: ${helperName}`);
    }
    const helperSource = canonicalSource.slice(start, end + 3);
    if (!helperSource.includes("lower(coalesce(om.status, '')) = 'active'")) {
      fail(`Active membership RLS migration must bind ${helperName} to active membership status`);
    }
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
    if (filename === PAYMENT_FIRST_CORE_MIGRATION) validatePaymentFirstCoreMigration(source);
    if (filename === PAYMENT_FIRST_GAP_STORAGE_MIGRATION) validatePaymentFirstGapStorageMigration(source);
    if (filename === TRUSTED_ACCESS_PREPARE_MIGRATION) validateTrustedAccessPrepareMigration(source);
    if (filename === TRUSTED_ACCESS_RUNTIME_MIGRATION) validateTrustedAccessRuntimeMigration(source);
    if (filename === TRUSTED_ACCESS_FINALIZE_MIGRATION) validateTrustedAccessFinalizeMigration(source);
    if (filename === TRUSTED_ACCESS_HARDEN_MIGRATION) validateTrustedAccessHardenMigration(source);
    if (filename === COMMERCIAL_QUOTA_MIGRATION) validateCommercialQuotaMutation(source);
    if (filename === DOCUMENT_COMMERCIAL_QUOTA_MIGRATION) validateDocumentCommercialQuotaMigration(source);
    if (filename === ACTIVE_MEMBERSHIP_RLS_MIGRATION) validateActiveMembershipRlsMigration(source);
    if (filename === DETERMINISTIC_COMMERCIAL_SOURCE_MIGRATION) {
      validateDeterministicCommercialSourceMigration(source);
    }

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
