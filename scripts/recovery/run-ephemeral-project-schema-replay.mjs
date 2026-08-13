#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function fail(message) {
  throw new Error(message);
}

function isValidMigrationTimestamp(value) {
  if (!/^\d{14}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function migrationVersion(name) {
  return name.match(/^(\d+).*\.sql$/)?.[1] ?? null;
}

export function inspectMigrationReplayDebt(migrationsDir) {
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  const invalidFiles = [];
  const byVersion = new Map();

  for (const name of names) {
    const strict = name.match(/^(\d{14})_(.+)\.sql$/);
    if (!strict || !isValidMigrationTimestamp(strict[1])) invalidFiles.push(name);

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

export function assertProjectSchemaReplayDeployable(migrationsDir) {
  const debt = inspectMigrationReplayDebt(migrationsDir);
  if (debt.invalidFiles.length === 0 && debt.duplicateVersions.length === 0) return debt;

  const duplicateSummary = debt.duplicateVersions
    .map(({ version, files }) => `${version}=[${files.join(',')}]`)
    .join('; ');
  const invalidSummary = debt.invalidFiles.join(',');

  fail(
    `MIGRATION_RECONCILIATION_REQUIRED invalid_local_files=${debt.invalidFiles.length} ` +
      `duplicate_versions=${debt.duplicateVersions.length}` +
      `${duplicateSummary ? ` duplicates=${duplicateSummary}` : ''}` +
      `${invalidSummary ? ` invalid=${invalidSummary}` : ''}`,
  );
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    fail('Exact-SHA project schema replay is restricted to GitHub Actions');
  }

  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

  // This smoke path intentionally does not reinterpret, rename, quarantine, or
  // synthesize production migration history. Duplicate/invalid history is a P0
  // reconciliation boundary and must remain fail-closed until reviewed. The
  // separate production dry-run/decision gate is authoritative for deployability.
  assertProjectSchemaReplayDeployable(migrationsDir);

  execFileSync(
    process.execPath,
    ['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project'],
    { stdio: 'inherit', env: process.env },
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
