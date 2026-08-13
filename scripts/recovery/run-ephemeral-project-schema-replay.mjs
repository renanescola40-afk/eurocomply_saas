#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

// These five historical migrations predate the timestamped migration convention and
// share the same 20260605 ledger prefix. Production has already consumed their
// canonical filenames, so they must never be renamed in the repository. A clean-room
// replay, however, needs their dependency order made explicit because lexical order
// would apply compliance_evidence before gap_analysis/findings.
const LEGACY_REPLAY_ORDER = [
  ['20260605_gap_analysis.sql', '20260605223000_legacy_gap_analysis.sql'],
  ['20260605_findings_tasks.sql', '20260605223100_legacy_findings_tasks.sql'],
  ['20260605_compliance_evidence.sql', '20260605223200_legacy_compliance_evidence.sql'],
  ['20260605_evidence_vault.sql', '20260605223300_legacy_evidence_vault.sql'],
  ['20260605_gap_analysis_user_scoped_patch.sql', '20260605223400_legacy_gap_analysis_user_scoped_patch.sql'],
];
const LEGACY_COLLISION_VERSION = '20260605';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function fail(message) {
  throw new Error(message);
}

function migrationVersion(name) {
  return name.match(/^(\d+).*\.sql$/)?.[1] ?? null;
}

function duplicateMigrationVersions(migrationsDir) {
  const byVersion = new Map();
  for (const entry of readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const version = migrationVersion(entry.name);
    if (!version) continue;
    const names = byVersion.get(version) ?? [];
    names.push(entry.name);
    byVersion.set(version, names);
  }

  return [...byVersion.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([version, names]) => [version, [...names].sort()]);
}

function assertKnownLegacyCollisionOnly(migrationsDir) {
  const duplicates = duplicateMigrationVersions(migrationsDir);
  const expectedNames = LEGACY_REPLAY_ORDER.map(([canonicalName]) => canonicalName).sort();

  if (duplicates.length !== 1) {
    fail(`Expected exactly one known legacy migration version collision; observed ${duplicates.length}`);
  }

  const [version, names] = duplicates[0];
  if (version !== LEGACY_COLLISION_VERSION || JSON.stringify(names) !== JSON.stringify(expectedNames)) {
    fail(`Unknown migration version collision detected for ${version}: ${names.join(', ')}`);
  }
}

function assertNoMigrationVersionCollisions(migrationsDir) {
  const duplicates = duplicateMigrationVersions(migrationsDir);
  if (duplicates.length > 0) {
    fail(
      `Migration version collision remains after deterministic staging: ${duplicates
        .map(([version, names]) => `${version}=[${names.join(',')}]`)
        .join('; ')}`,
    );
  }
}

function restoreLegacyReplay(staged) {
  const failures = [];

  for (const item of [...staged].reverse()) {
    try {
      if (!existsSync(item.replayPath)) {
        failures.push(`missing staged file ${item.canonicalName}`);
        continue;
      }
      if (sha256(item.replayPath) !== item.digest) {
        failures.push(`digest mismatch for ${item.canonicalName}`);
        continue;
      }
      renameSync(item.replayPath, item.canonicalPath);
      if (sha256(item.canonicalPath) !== item.digest) {
        failures.push(`restored digest mismatch for ${item.canonicalName}`);
      }
    } catch (error) {
      failures.push(`${item.canonicalName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    fail(`Failed to restore canonical legacy migrations after ephemeral replay: ${failures.join('; ')}`);
  }
}

function stageLegacyReplay(migrationsDir) {
  assertKnownLegacyCollisionOnly(migrationsDir);
  const staged = [];

  try {
    for (const [canonicalName, replayName] of LEGACY_REPLAY_ORDER) {
      const canonicalPath = join(migrationsDir, canonicalName);
      const replayPath = join(migrationsDir, replayName);

      if (!existsSync(canonicalPath)) fail(`Missing canonical legacy migration: ${canonicalName}`);
      if (existsSync(replayPath)) fail(`Unexpected staged migration already exists: ${replayName}`);

      const digest = sha256(canonicalPath);
      renameSync(canonicalPath, replayPath);
      if (sha256(replayPath) !== digest) fail(`Legacy migration bytes changed while staging: ${canonicalName}`);
      staged.push({ canonicalPath, replayPath, canonicalName, digest });
    }

    assertNoMigrationVersionCollisions(migrationsDir);
    return staged;
  } catch (error) {
    if (staged.length > 0) {
      try {
        restoreLegacyReplay(staged);
      } catch (restoreError) {
        const original = error instanceof Error ? error.message : String(error);
        const restore = restoreError instanceof Error ? restoreError.message : String(restoreError);
        fail(`Legacy migration staging failed (${original}) and rollback failed (${restore})`);
      }
    }
    throw error;
  }
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Legacy migration replay staging is restricted to GitHub Actions');
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const staged = stageLegacyReplay(migrationsDir);
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
    restoreLegacyReplay(staged);
  } catch (error) {
    restoreError = error;
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  process.stdout.write(
    `Ephemeral schema replay staged ${LEGACY_REPLAY_ORDER.length} legacy migrations in dependency order without changing canonical repository filenames.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
