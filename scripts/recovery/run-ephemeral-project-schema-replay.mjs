#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

export const DUPLICATE_REVIEW_REFERENCE =
  'docs/security/evidence/human-review/supabase-migration-mega-batch-i.md';
export const INVALID_REVIEW_REFERENCE =
  'docs/security/evidence/human-review/supabase-migration-mega-batch-o-review-preparation.md';

export const KNOWN_DUPLICATE_MIGRATION_GROUPS = Object.freeze({
  '20260605': [
    '20260605_compliance_evidence.sql',
    '20260605_evidence_vault.sql',
    '20260605_findings_tasks.sql',
    '20260605_gap_analysis.sql',
    '20260605_gap_analysis_user_scoped_patch.sql',
  ],
  '20260610': [
    '20260610_ai_governance_inventory.sql',
    '20260610_ai_incident_register.sql',
    '20260610_billing_stripe_sync.sql',
    '20260610_public_launch_readiness.sql',
  ],
  '20260612': [
    '20260612_audit_event_hash_chain.sql',
    '20260612_intelligence_tables.sql',
    '20260612_seed_intelligence_items.sql',
  ],
  '20260613': [
    '20260613_audit_event_chained_rpc.sql',
    '20260613_organization_add_ons.sql',
  ],
  '20260620120000': [
    '20260620120000_controlled_document_storage_read_lockdown.sql',
    '20260620120000_enterprise_multi_tenant_rls_final_lock.sql',
  ],
  '20260623120000': [
    '20260623120000_live_rls_validation_inventory.sql',
    '20260623120000_step_up_challenge_store.sql',
  ],
  '20260626120000': [
    '20260626120000_clerk_uuid_safe_rls_helpers.sql',
    '20260626120000_org_billing_entitlements.sql',
  ],
  '20260629113000': [
    '20260629113000_onboarding_activation_runs_delete_policy.sql',
    '20260629113000_onboarding_activation_runs_rls_helper.sql',
  ],
  '20260706103000': [
    '20260706103000_ai_system_history_rls_policies.sql',
    '20260706103000_ai_system_relationship_fields.sql',
  ],
  '20260719224500': [
    '20260719224500_ai_incident_lifecycle_atomic.sql',
    '20260719224500_enforce_organization_invite_creator_scope.sql',
  ],
  '20260720190000': [
    '20260720190000_data_governance_enterprise.sql',
    '20260720190000_eu_ai_act_governance_lifecycle.sql',
  ],
  '20260721200000': [
    '20260721200000_enterprise_trigger_hardening.sql',
    '20260721200000_prohibited_practices_governance.sql',
  ],
  '20260723223000': [
    '20260723223000_enterprise_group_access_policies.sql',
    '20260723223000_qualified_review_consolidated.sql',
  ],
  '20260724001000': [
    '20260724001000_enterprise_group_access_reconciliation.sql',
    '20260724001000_qualified_review_decision_controls.sql',
  ],
  '20260724103000': [
    '20260724103000_enterprise_group_access_reconciliation_queue.sql',
    '20260724103000_enterprise_seat_concurrency.sql',
    '20260724103000_qualified_review_api_operations.sql',
  ],
  '20260728170000': [
    '20260728170000_billing_lifecycle_requests.sql',
    '20260728170000_harden_billing_tenant_tables.sql',
  ],
});

export const UNAPPLIED_LEGACY_MIGRATIONS = Object.freeze([
  ...KNOWN_DUPLICATE_MIGRATION_GROUPS['20260605'],
]);
export const UNRESOLVED_INVALID_MIGRATIONS = Object.freeze([
  '20260619_multi_tenant_rls_hardening.sql',
]);
export const SCHEMA_EFFECT_REPLACED_MIGRATIONS = Object.freeze({
  '20260613_organization_add_ons.sql': Object.freeze([
    'supabase/migrations/20260813124224_reconcile_organization_add_ons.sql',
  ]),
  '20260620120000_enterprise_multi_tenant_rls_final_lock.sql': Object.freeze([
    'supabase/migrations/20260619103000_complete_multi_tenant_rls_policies.sql',
    'supabase/migrations/20260629110000_enterprise_tenant_rls_cleanup_indexes.sql',
    'supabase/migrations/20260807091341_reconcile_membership_rls_and_remove_permissive_bypasses.sql',
    'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
  ]),
});

// This historical file is valid SQL only after the optional proof table that it
// references exists. Production lineage is not rewritten: the rule below is
// restricted to the disposable schema-effect runner and preserves source bytes.
export const SCHEMA_EFFECT_REORDERED_MIGRATIONS = Object.freeze({
  '20260624174000_live_rls_validation_min_policy_patch.sql': Object.freeze({
    afterVersion: '20260624220000',
    prerequisitePath: 'supabase/migrations/20260624220000_live_rls_validation_missing_tables.sql',
  }),
});
const UNAPPLIED_LEGACY_VERSION = '20260605';

function fail(message) { throw new Error(message); }
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function migrationVersion(name) { return name.match(/^(\d+).*\.sql$/)?.[1] ?? null; }
function migrationFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^(\d+).*\.sql$/.test(entry.name))
    .map((entry) => entry.name).sort();
}

export function inspectMigrationReplayDebt(dir) {
  const invalidFiles = [];
  const byVersion = new Map();
  for (const name of migrationFiles(dir)) {
    if (!/^\d{14}_.+\.sql$/.test(name)) invalidFiles.push(name);
    const version = migrationVersion(name);
    if (!version) continue;
    const group = byVersion.get(version) ?? [];
    group.push(name);
    byVersion.set(version, group);
  }
  const duplicateVersions = [...byVersion.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([version, files]) => ({ version, files: [...files].sort() }))
    .sort((a, b) => a.version.localeCompare(b.version));
  return { invalidFiles, duplicateVersions };
}

function expectedDuplicateVersions() {
  return Object.entries(KNOWN_DUPLICATE_MIGRATION_GROUPS)
    .map(([version, files]) => ({ version, files: [...files].sort() }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

function assertReviewedReplayInventory(dir) {
  if (!existsSync(DUPLICATE_REVIEW_REFERENCE)) fail(`Missing duplicate review evidence: ${DUPLICATE_REVIEW_REFERENCE}`);
  if (!existsSync(INVALID_REVIEW_REFERENCE)) fail(`Missing invalid-file review evidence: ${INVALID_REVIEW_REFERENCE}`);
  const duplicateReview = readFileSync(DUPLICATE_REVIEW_REFERENCE, 'utf8');
  const invalidReview = readFileSync(INVALID_REVIEW_REFERENCE, 'utf8');
  const debt = inspectMigrationReplayDebt(dir);
  const expected = expectedDuplicateVersions();

  if (JSON.stringify(debt.duplicateVersions) !== JSON.stringify(expected)) {
    fail(`MIGRATION_DUPLICATE_INVENTORY_DRIFT expected_groups=${expected.length} observed_groups=${debt.duplicateVersions.length}`);
  }
  for (const { version, files } of expected) {
    if (!duplicateReview.includes(`version \`${version}\``)) fail(`Duplicate review missing version ${version}`);
    for (const file of files) if (!duplicateReview.includes(`\`${file}\``)) fail(`Duplicate review missing file ${file}`);
  }
  for (const file of UNRESOLVED_INVALID_MIGRATIONS) {
    if (!invalidReview.includes(`\`${file}\``) || !invalidReview.includes('REQUIRES_SPLIT_REVIEW')) {
      fail(`Invalid migration review boundary missing for ${file}`);
    }
  }
  for (const [legacyFile, replacementPaths] of Object.entries(SCHEMA_EFFECT_REPLACED_MIGRATIONS)) {
    if (!duplicateReview.includes(`\`${legacyFile}\``)) fail(`Replacement source is not in reviewed duplicate inventory: ${legacyFile}`);
    for (const replacementPath of replacementPaths) {
      if (!existsSync(replacementPath)) fail(`Canonical schema-effect replacement is missing: ${replacementPath}`);
    }
  }
  for (const [historicalFile, rule] of Object.entries(SCHEMA_EFFECT_REORDERED_MIGRATIONS)) {
    const historicalPath = join(dir, historicalFile);
    if (!existsSync(historicalPath)) fail(`Schema-effect ordering source is missing: ${historicalFile}`);
    if (!existsSync(rule.prerequisitePath)) fail(`Schema-effect ordering prerequisite is missing: ${rule.prerequisitePath}`);
    const prerequisiteName = rule.prerequisitePath.split('/').at(-1) ?? '';
    if (migrationVersion(prerequisiteName) !== rule.afterVersion) {
      fail(`Schema-effect ordering prerequisite version drift for ${historicalFile}`);
    }
    const historicalSql = readFileSync(historicalPath, 'utf8');
    const prerequisiteSql = readFileSync(rule.prerequisitePath, 'utf8');
    if (!historicalSql.includes('alter table public.tasks enable row level security')) {
      fail(`Schema-effect ordering source no longer contains the reviewed tasks dependency: ${historicalFile}`);
    }
    if (!prerequisiteSql.includes('create table if not exists public.tasks')) {
      fail(`Schema-effect ordering prerequisite no longer creates public.tasks: ${rule.prerequisitePath}`);
    }
  }

  const reviewedDuplicateFiles = new Set(expected.flatMap(({ files }) => files));
  const allowedInvalid = new Set([...reviewedDuplicateFiles, ...UNRESOLVED_INVALID_MIGRATIONS]);
  const unexpectedInvalid = debt.invalidFiles.filter((file) => !allowedInvalid.has(file));
  if (unexpectedInvalid.length > 0) {
    fail(`MIGRATION_RECONCILIATION_REQUIRED unexpected_invalid_files=${unexpectedInvalid.join(',')}`);
  }
}

function stagingDirectory() {
  const root = process.env.RUNNER_TEMP;
  if (!root) fail('RUNNER_TEMP is required for disposable migration replay staging');
  const runId = String(process.env.GITHUB_RUN_ID ?? 'local').replace(/[^A-Za-z0-9_-]/g, '-');
  const attempt = String(process.env.GITHUB_RUN_ATTEMPT ?? '1').replace(/[^A-Za-z0-9_-]/g, '-');
  return join(root, `risck-schema-effect-replay-${runId}-${attempt}`);
}

function formatTimestamp(date) {
  const p = (value, width = 2) => String(value).padStart(width, '0');
  return `${p(date.getUTCFullYear(), 4)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`
    + `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}
function parseTimestamp(version) {
  const normalized = version.length === 8 ? `${version}000000` : version;
  if (!/^\d{14}$/.test(normalized)) fail(`Unsupported duplicate version ${version}`);
  const d = new Date(Date.UTC(
    Number(normalized.slice(0, 4)), Number(normalized.slice(4, 6)) - 1,
    Number(normalized.slice(6, 8)), Number(normalized.slice(8, 10)),
    Number(normalized.slice(10, 12)), Number(normalized.slice(12, 14)),
  ));
  if (formatTimestamp(d) !== normalized) fail(`Invalid duplicate timestamp ${version}`);
  return d;
}
function allocateReplayVersions(version, count, occupied) {
  const cursor = parseTimestamp(version);
  const day = formatTimestamp(cursor).slice(0, 8);
  const out = [];
  while (out.length < count) {
    const candidate = formatTimestamp(cursor);
    if (!occupied.has(candidate)) { occupied.add(candidate); out.push(candidate); }
    cursor.setUTCSeconds(cursor.getUTCSeconds() + 1);
    if (formatTimestamp(cursor).slice(0, 8) !== day) fail(`No same-day replay slots remain for ${version}`);
  }
  return out;
}
function replayName(canonical, version) {
  const suffix = canonical.replace(/^\d+_?/, '');
  if (!suffix || suffix === canonical) fail(`Cannot derive replay suffix for ${canonical}`);
  return `${version}_${suffix}`;
}

function restoreItems(items) {
  const failures = [];
  for (const item of [...items].reverse()) {
    try {
      if (item.replayPath) {
        if (!existsSync(item.replayPath) || sha256(item.replayPath) !== item.digest) {
          failures.push(`replay integrity failure ${item.canonicalName}`); continue;
        }
        rmSync(item.replayPath, { force: true });
      }
      if (!existsSync(item.backupPath) || sha256(item.backupPath) !== item.digest) {
        failures.push(`backup integrity failure ${item.canonicalName}`); continue;
      }
      if (existsSync(item.canonicalPath)) { failures.push(`canonical path reappeared ${item.canonicalName}`); continue; }
      copyFileSync(item.backupPath, item.canonicalPath);
      if (sha256(item.canonicalPath) !== item.digest) { failures.push(`restore digest mismatch ${item.canonicalName}`); continue; }
      rmSync(item.backupPath, { force: true });
    } catch (error) { failures.push(`${item.canonicalName}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const dir = items[0]?.stagingDir;
  if (failures.length === 0 && dir) rmSync(dir, { recursive: true, force: true });
  if (failures.length) fail(`Failed to restore repository migration bytes: ${failures.join('; ')}`);
}

function backupAndRemove(dir, stagingDir, canonicalName) {
  const canonicalPath = join(dir, canonicalName);
  const backupPath = join(stagingDir, canonicalName);
  if (!existsSync(canonicalPath)) fail(`Missing reviewed migration artifact ${canonicalName}`);
  const digest = sha256(canonicalPath);
  copyFileSync(canonicalPath, backupPath);
  if (sha256(backupPath) !== digest) fail(`Backup digest mismatch ${canonicalName}`);
  rmSync(canonicalPath);
  return { canonicalName, canonicalPath, backupPath, stagingDir, digest, replayName: null, replayPath: null };
}

function stageReplayItem(dir, stagingDir, canonicalName, version, occupied) {
  const item = backupAndRemove(dir, stagingDir, canonicalName);
  const [replayVersion] = allocateReplayVersions(version, 1, occupied);
  item.replayName = replayName(canonicalName, replayVersion);
  item.replayPath = join(dir, item.replayName);
  copyFileSync(item.backupPath, item.replayPath);
  if (sha256(item.replayPath) !== item.digest) fail(`Replay digest mismatch ${canonicalName}`);
  return item;
}

function prepareSchemaEffectReplay(dir) {
  assertReviewedReplayInventory(dir);
  const stagingDir = stagingDirectory();
  if (existsSync(stagingDir)) fail(`Replay staging already exists: ${stagingDir}`);
  mkdirSync(stagingDir, { recursive: false, mode: 0o700 });
  const duplicateVersions = new Set(Object.keys(KNOWN_DUPLICATE_MIGRATION_GROUPS));
  const occupied = new Set(migrationFiles(dir).map(migrationVersion).filter((v) => v && !duplicateVersions.has(v)));
  const items = [];
  let replayed = 0;
  let replaced = 0;
  let reordered = 0;
  try {
    for (const { version, files } of expectedDuplicateVersions()) {
      const executableFiles = files.filter((file) =>
        version !== UNAPPLIED_LEGACY_VERSION && !(file in SCHEMA_EFFECT_REPLACED_MIGRATIONS));
      const versions = allocateReplayVersions(version, executableFiles.length, occupied);
      let replayIndex = 0;

      for (const canonicalName of files) {
        const item = backupAndRemove(dir, stagingDir, canonicalName);
        const execute = version !== UNAPPLIED_LEGACY_VERSION
          && !(canonicalName in SCHEMA_EFFECT_REPLACED_MIGRATIONS);
        if (execute) {
          item.replayName = replayName(canonicalName, versions[replayIndex]);
          replayIndex += 1;
          item.replayPath = join(dir, item.replayName);
          copyFileSync(item.backupPath, item.replayPath);
          if (sha256(item.replayPath) !== item.digest) fail(`Replay digest mismatch ${canonicalName}`);
          replayed += 1;
        } else if (canonicalName in SCHEMA_EFFECT_REPLACED_MIGRATIONS) {
          replaced += 1;
        }
        items.push(item);
      }
    }
    for (const [canonicalName, rule] of Object.entries(SCHEMA_EFFECT_REORDERED_MIGRATIONS)) {
      items.push(stageReplayItem(dir, stagingDir, canonicalName, rule.afterVersion, occupied));
      reordered += 1;
    }
    for (const canonicalName of UNRESOLVED_INVALID_MIGRATIONS) {
      items.push(backupAndRemove(dir, stagingDir, canonicalName));
    }
    const remaining = inspectMigrationReplayDebt(dir);
    if (remaining.invalidFiles.length || remaining.duplicateVersions.length) {
      fail(`Disposable replay remains invalid: invalid=${remaining.invalidFiles.length} duplicates=${remaining.duplicateVersions.length}`);
    }
    return { items, replayed, replaced, reordered };
  } catch (error) {
    if (items.length) {
      try { restoreItems(items); } catch (restoreError) {
        fail(`Replay preparation failed and restore failed: ${error instanceof Error ? error.message : String(error)} / ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
      }
    } else rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

function appendGithubEnv(name, value) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') fail('Disposable schema-effect replay is restricted to GitHub Actions');
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const { items, replayed, replaced, reordered } = prepareSchemaEffectReplay(dir);
  let replayError = null;
  try {
    execFileSync(process.execPath, ['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project'], { stdio: 'inherit', env: process.env });
  } catch (error) { replayError = error; }
  let restoreError = null;
  try { restoreItems(items); } catch (error) { restoreError = error; }
  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  appendGithubEnv('RECOVERY_EPHEMERAL_DUPLICATE_GROUP_COUNT', '16');
  appendGithubEnv('RECOVERY_EPHEMERAL_REPLAY_STAGED_FILE_COUNT', String(replayed));
  appendGithubEnv('RECOVERY_EPHEMERAL_LEGACY_EXCLUDED_FILE_COUNT', String(UNAPPLIED_LEGACY_MIGRATIONS.length));
  appendGithubEnv('RECOVERY_EPHEMERAL_UNRESOLVED_INVALID_EXCLUDED_FILE_COUNT', String(UNRESOLVED_INVALID_MIGRATIONS.length));
  appendGithubEnv('RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REPLACED_FILE_COUNT', String(replaced));
  appendGithubEnv('RECOVERY_EPHEMERAL_SCHEMA_EFFECT_REORDERED_FILE_COUNT', String(reordered));
  appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL', 'false');
  process.stdout.write(`Disposable schema-effect replay staged ${replayed} duplicate files, dependency-reordered ${reordered}, excluded ${UNAPPLIED_LEGACY_MIGRATIONS.length} legacy, ${UNRESOLVED_INVALID_MIGRATIONS.length} unresolved-invalid, and ${replaced} schema-effect-replaced files; replay timestamps are not migration-history repair evidence.\n`);
}

if (process.argv[1]?.endsWith('run-ephemeral-project-schema-replay.mjs')) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
}
