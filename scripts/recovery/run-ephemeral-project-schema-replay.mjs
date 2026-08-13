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

// Exact duplicate-version inventory explicitly owner-reviewed in Mega Batch I.
// This allowlist authorizes only disposable schema-effect replay. It does NOT
// resolve REQUIRES_SPLIT_REVIEW, repair migration history, authorize staging,
// or authorize production execution.
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

// Read-only production verification on 2026-08-13 found no matching ledger
// version for these date-only files and no canonical workspaces/workspace_members
// model they require. They remain source artifacts and are never executed here.
export const UNAPPLIED_LEGACY_MIGRATIONS = Object.freeze([
  ...KNOWN_DUPLICATE_MIGRATION_GROUPS['20260605'],
]);
const UNAPPLIED_LEGACY_VERSION = '20260605';

function fail(message) {
  throw new Error(message);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function migrationVersion(name) {
  return name.match(/^(\d+).*\.sql$/)?.[1] ?? null;
}

function migrationFiles(migrationsDir) {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^(\d+).*\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function inspectMigrationReplayDebt(migrationsDir) {
  const names = migrationFiles(migrationsDir);
  const invalidFiles = [];
  const byVersion = new Map();

  for (const name of names) {
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
    .sort((left, right) => left.version.localeCompare(right.version));

  return { invalidFiles, duplicateVersions };
}

function expectedDuplicateVersions() {
  return Object.entries(KNOWN_DUPLICATE_MIGRATION_GROUPS)
    .map(([version, files]) => ({ version, files: [...files].sort() }))
    .sort((left, right) => left.version.localeCompare(right.version));
}

function assertReviewedDuplicateInventory(migrationsDir) {
  if (!existsSync(DUPLICATE_REVIEW_REFERENCE)) {
    fail(`Reviewed duplicate migration evidence is missing: ${DUPLICATE_REVIEW_REFERENCE}`);
  }
  const review = readFileSync(DUPLICATE_REVIEW_REFERENCE, 'utf8');
  const debt = inspectMigrationReplayDebt(migrationsDir);
  const expected = expectedDuplicateVersions();

  if (JSON.stringify(debt.duplicateVersions) !== JSON.stringify(expected)) {
    fail(
      `MIGRATION_DUPLICATE_INVENTORY_DRIFT expected_groups=${expected.length} `
      + `observed_groups=${debt.duplicateVersions.length}`,
    );
  }

  for (const { version, files } of expected) {
    if (!review.includes(`version \`${version}\``)) {
      fail(`Reviewed duplicate migration version missing from evidence: ${version}`);
    }
    for (const file of files) {
      if (!review.includes(`\`${file}\``)) {
        fail(`Reviewed duplicate migration file missing from evidence: ${file}`);
      }
    }
  }

  const unexpectedInvalid = debt.invalidFiles
    .filter((file) => !UNAPPLIED_LEGACY_MIGRATIONS.includes(file));
  if (unexpectedInvalid.length > 0) {
    fail(`MIGRATION_RECONCILIATION_REQUIRED unexpected_invalid_files=${unexpectedInvalid.join(',')}`);
  }

  return debt;
}

function stagingDirectory() {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) fail('RUNNER_TEMP is required for disposable migration replay staging');
  const runId = String(process.env.GITHUB_RUN_ID ?? 'local').replace(/[^A-Za-z0-9_-]/g, '-');
  const attempt = String(process.env.GITHUB_RUN_ATTEMPT ?? '1').replace(/[^A-Za-z0-9_-]/g, '-');
  return join(runnerTemp, `risck-schema-effect-replay-${runId}-${attempt}`);
}

function parseTimestamp(version) {
  const normalized = version.length === 8 ? `${version}000000` : version;
  if (!/^\d{14}$/.test(normalized)) fail(`Unsupported duplicate migration version: ${version}`);
  const parts = [
    Number(normalized.slice(0, 4)),
    Number(normalized.slice(4, 6)),
    Number(normalized.slice(6, 8)),
    Number(normalized.slice(8, 10)),
    Number(normalized.slice(10, 12)),
    Number(normalized.slice(12, 14)),
  ];
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  if (formatTimestamp(date) !== normalized) fail(`Invalid duplicate migration timestamp: ${version}`);
  return date;
}

function formatTimestamp(date) {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function allocateReplayVersions(version, count, occupied) {
  const cursor = parseTimestamp(version);
  const sourceDay = formatTimestamp(cursor).slice(0, 8);
  const result = [];

  while (result.length < count) {
    const candidate = formatTimestamp(cursor);
    if (!occupied.has(candidate)) {
      occupied.add(candidate);
      result.push(candidate);
    }
    cursor.setUTCSeconds(cursor.getUTCSeconds() + 1);
    if (formatTimestamp(cursor).slice(0, 8) !== sourceDay) {
      fail(`No same-day disposable replay slots remain for ${version}`);
    }
  }
  return result;
}

function replayName(canonicalName, version) {
  const suffix = canonicalName.replace(/^\d+_?/, '');
  if (!suffix || suffix === canonicalName) fail(`Cannot derive replay suffix for ${canonicalName}`);
  return `${version}_${suffix}`;
}

function removeAndRestoreReplayFiles(items) {
  const failures = [];

  for (const item of [...items].reverse()) {
    try {
      if (item.replayPath) {
        if (!existsSync(item.replayPath)) {
          failures.push(`missing disposable replay file ${item.replayName}`);
          continue;
        }
        if (sha256(item.replayPath) !== item.digest) {
          failures.push(`disposable replay digest mismatch for ${item.canonicalName}`);
          continue;
        }
        rmSync(item.replayPath, { force: true });
      }
      if (!existsSync(item.backupPath) || sha256(item.backupPath) !== item.digest) {
        failures.push(`replay backup integrity failure for ${item.canonicalName}`);
        continue;
      }
      if (existsSync(item.canonicalPath)) {
        failures.push(`canonical file unexpectedly exists before restore: ${item.canonicalName}`);
        continue;
      }
      copyFileSync(item.backupPath, item.canonicalPath);
      if (sha256(item.canonicalPath) !== item.digest) {
        failures.push(`canonical restore digest mismatch for ${item.canonicalName}`);
        continue;
      }
      rmSync(item.backupPath, { force: true });
    } catch (error) {
      failures.push(`${item.canonicalName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const dir = items[0]?.stagingDir;
  if (failures.length === 0 && dir) rmSync(dir, { recursive: true, force: true });
  if (failures.length > 0) {
    fail(`Failed to restore repository migration bytes after disposable replay: ${failures.join('; ')}`);
  }
}

function prepareSchemaEffectReplay(migrationsDir) {
  assertReviewedDuplicateInventory(migrationsDir);
  const dir = stagingDirectory();
  if (existsSync(dir)) fail(`Disposable migration replay staging already exists: ${dir}`);
  mkdirSync(dir, { recursive: false, mode: 0o700 });

  const duplicateVersions = new Set(Object.keys(KNOWN_DUPLICATE_MIGRATION_GROUPS));
  const occupied = new Set(
    migrationFiles(migrationsDir)
      .map(migrationVersion)
      .filter((version) => version && !duplicateVersions.has(version)),
  );
  const items = [];
  let replayed = 0;

  try {
    for (const { version, files } of expectedDuplicateVersions()) {
      const executeEffects = version !== UNAPPLIED_LEGACY_VERSION;
      const replayVersions = executeEffects
        ? allocateReplayVersions(version, files.length, occupied)
        : [];

      for (const [index, canonicalName] of files.entries()) {
        const canonicalPath = join(migrationsDir, canonicalName);
        const backupPath = join(dir, canonicalName);
        if (!existsSync(canonicalPath)) fail(`Missing reviewed duplicate migration: ${canonicalName}`);
        const digest = sha256(canonicalPath);
        copyFileSync(canonicalPath, backupPath);
        if (sha256(backupPath) !== digest) fail(`Replay backup digest mismatch for ${canonicalName}`);
        rmSync(canonicalPath);

        let stagedName = null;
        let stagedPath = null;
        if (executeEffects) {
          stagedName = replayName(canonicalName, replayVersions[index]);
          stagedPath = join(migrationsDir, stagedName);
          if (existsSync(stagedPath)) fail(`Disposable replay path already exists: ${stagedName}`);
          copyFileSync(backupPath, stagedPath);
          if (sha256(stagedPath) !== digest) fail(`Replay staging digest mismatch for ${canonicalName}`);
          replayed += 1;
        }

        items.push({
          canonicalName,
          canonicalPath,
          backupPath,
          stagingDir: dir,
          digest,
          replayName: stagedName,
          replayPath: stagedPath,
        });
      }
    }

    const remainingDebt = inspectMigrationReplayDebt(migrationsDir);
    if (remainingDebt.invalidFiles.length > 0 || remainingDebt.duplicateVersions.length > 0) {
      fail(
        `Disposable schema-effect staging is not replayable: invalid=${remainingDebt.invalidFiles.length} `
        + `duplicates=${remainingDebt.duplicateVersions.length}`,
      );
    }
    return { items, replayed };
  } catch (error) {
    if (items.length > 0) {
      try {
        removeAndRestoreReplayFiles(items);
      } catch (restoreError) {
        const original = error instanceof Error ? error.message : String(error);
        const restore = restoreError instanceof Error ? restoreError.message : String(restoreError);
        fail(`Disposable replay preparation failed (${original}); repository restore also failed (${restore})`);
      }
    } else {
      rmSync(dir, { recursive: true, force: true });
    }
    throw error;
  }
}

function appendGithubEnv(name, value) {
  const file = process.env.GITHUB_ENV;
  if (file) appendFileSync(file, `${name}=${value}\n`, { encoding: 'utf8' });
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Disposable schema-effect replay is restricted to GitHub Actions');
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const { items, replayed } = prepareSchemaEffectReplay(migrationsDir);
  let replayError = null;

  try {
    execFileSync(
      process.execPath,
      ['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project'],
      { stdio: 'inherit', env: process.env },
    );
  } catch (error) {
    replayError = error;
  }

  let restoreError = null;
  try {
    removeAndRestoreReplayFiles(items);
  } catch (error) {
    restoreError = error;
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  appendGithubEnv('RECOVERY_EPHEMERAL_DUPLICATE_GROUP_COUNT', '16');
  appendGithubEnv('RECOVERY_EPHEMERAL_REPLAY_STAGED_FILE_COUNT', String(replayed));
  appendGithubEnv('RECOVERY_EPHEMERAL_LEGACY_EXCLUDED_FILE_COUNT', String(UNAPPLIED_LEGACY_MIGRATIONS.length));
  appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL', 'false');

  process.stdout.write(
    `Disposable schema-effect replay staged ${replayed} reviewed duplicate files, excluded `
    + `${UNAPPLIED_LEGACY_MIGRATIONS.length} proven unapplied legacy files, and restored all repository bytes. `
    + 'Replay-only timestamps are not migration-history repair evidence.\n',
  );
}

if (process.argv[1]?.endsWith('run-ephemeral-project-schema-replay.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
