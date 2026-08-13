#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

// These five unversioned files are retained as historical source artifacts, but they
// were never recorded in the production Supabase migration ledger and their legacy
// workspaces/workspace_members dependencies are not part of the canonical production
// schema. Clean-room replay must therefore quarantine them rather than manufacture
// synthetic migration versions that would create schema production never applied.
export const UNAPPLIED_LEGACY_MIGRATIONS = [
  '20260605_gap_analysis.sql',
  '20260605_findings_tasks.sql',
  '20260605_compliance_evidence.sql',
  '20260605_evidence_vault.sql',
  '20260605_gap_analysis_user_scoped_patch.sql',
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
  const expectedNames = [...UNAPPLIED_LEGACY_MIGRATIONS].sort();

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
      `Migration version collision remains after legacy quarantine: ${duplicates
        .map(([version, names]) => `${version}=[${names.join(',')}]`)
        .join('; ')}`,
    );
  }
}

function quarantineDirectory() {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) fail('RUNNER_TEMP is required for legacy migration quarantine');
  const runId = String(process.env.GITHUB_RUN_ID ?? 'local').replace(/[^A-Za-z0-9_-]/g, '-');
  const attempt = String(process.env.GITHUB_RUN_ATTEMPT ?? '1').replace(/[^A-Za-z0-9_-]/g, '-');
  return join(runnerTemp, `risck-unapplied-legacy-migrations-${runId}-${attempt}`);
}

function restoreLegacyQuarantine(quarantined) {
  const failures = [];

  for (const item of [...quarantined].reverse()) {
    try {
      if (!existsSync(item.quarantinePath)) {
        failures.push(`missing quarantined file ${item.canonicalName}`);
        continue;
      }
      if (sha256(item.quarantinePath) !== item.digest) {
        failures.push(`quarantine digest mismatch for ${item.canonicalName}`);
        continue;
      }
      if (existsSync(item.canonicalPath)) {
        failures.push(`canonical file unexpectedly reappeared before restore: ${item.canonicalName}`);
        continue;
      }
      copyFileSync(item.quarantinePath, item.canonicalPath);
      if (sha256(item.canonicalPath) !== item.digest) {
        failures.push(`restored digest mismatch for ${item.canonicalName}`);
        continue;
      }
      rmSync(item.quarantinePath, { force: true });
    } catch (error) {
      failures.push(`${item.canonicalName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const quarantineDir = quarantined[0]?.quarantineDir;
  if (quarantineDir) {
    try {
      rmSync(quarantineDir, { recursive: true, force: true });
    } catch (error) {
      failures.push(`quarantine cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    fail(`Failed to restore canonical legacy migration artifacts after ephemeral replay: ${failures.join('; ')}`);
  }
}

function quarantineUnappliedLegacyMigrations(migrationsDir) {
  assertKnownLegacyCollisionOnly(migrationsDir);
  const quarantineDir = quarantineDirectory();
  if (existsSync(quarantineDir)) {
    fail(`Legacy migration quarantine already exists: ${quarantineDir}`);
  }
  mkdirSync(quarantineDir, { recursive: false, mode: 0o700 });
  const quarantined = [];

  try {
    for (const canonicalName of UNAPPLIED_LEGACY_MIGRATIONS) {
      const canonicalPath = join(migrationsDir, canonicalName);
      const quarantinePath = join(quarantineDir, canonicalName);

      if (!existsSync(canonicalPath)) fail(`Missing canonical legacy migration artifact: ${canonicalName}`);
      if (existsSync(quarantinePath)) fail(`Unexpected quarantined migration already exists: ${canonicalName}`);

      const digest = sha256(canonicalPath);
      copyFileSync(canonicalPath, quarantinePath);
      if (sha256(quarantinePath) !== digest) {
        fail(`Legacy migration bytes changed while entering quarantine: ${canonicalName}`);
      }
      rmSync(canonicalPath);
      if (existsSync(canonicalPath)) fail(`Legacy migration remained visible after quarantine: ${canonicalName}`);
      quarantined.push({ canonicalPath, quarantinePath, quarantineDir, canonicalName, digest });
    }

    assertNoMigrationVersionCollisions(migrationsDir);
    return quarantined;
  } catch (error) {
    if (quarantined.length > 0) {
      try {
        restoreLegacyQuarantine(quarantined);
      } catch (restoreError) {
        const original = error instanceof Error ? error.message : String(error);
        const restore = restoreError instanceof Error ? restoreError.message : String(restoreError);
        fail(`Legacy migration quarantine failed (${original}) and rollback failed (${restore})`);
      }
    } else {
      rmSync(quarantineDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Legacy migration clean-room replay is restricted to GitHub Actions');
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const quarantined = quarantineUnappliedLegacyMigrations(migrationsDir);
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
    restoreLegacyQuarantine(quarantined);
  } catch (error) {
    restoreError = error;
  }

  if (restoreError) throw restoreError;
  if (replayError) throw replayError;

  process.stdout.write(
    `Ephemeral schema replay quarantined ${UNAPPLIED_LEGACY_MIGRATIONS.length} unapplied legacy migration artifacts and restored their exact bytes after canonical migration replay.\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
