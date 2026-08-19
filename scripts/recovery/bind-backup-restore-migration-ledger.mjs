#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/p1/backup-restore-tested.json';
const VERSION = /^\d{14}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;

function required(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalLedgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify(versions)).digest('hex')}`;
}

function captureSourceLedger(connection) {
  const output = execFileSync(
    'psql',
    [
      connection,
      '--no-psqlrc',
      '--tuples-only',
      '--no-align',
      '--set',
      'ON_ERROR_STOP=1',
      '--command',
      'begin transaction read only; select version from supabase_migrations.schema_migrations order by version; rollback;',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 },
  ).toString('utf8');

  const versions = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => VERSION.test(line));

  assert(versions.length > 0, 'source_migration_ledger_empty');
  assert(new Set(versions).size === versions.length, 'source_migration_ledger_duplicate_version');
  const sorted = [...versions].sort();
  assert(JSON.stringify(sorted) === JSON.stringify(versions), 'source_migration_ledger_not_sorted');
  return {
    count: versions.length,
    head: versions.at(-1),
    sha256: canonicalLedgerDigest(versions),
  };
}

function main() {
  const source = required('RECOVERY_SOURCE_DATABASE_URL').replace(/[\r\n]+/g, '').trim();
  const releaseSha = required('RELEASE_SHA').toLowerCase();
  const observedSha = required('GITHUB_SHA').toLowerCase();
  const runId = required('GITHUB_RUN_ID');

  assert(FULL_SHA.test(releaseSha), 'release_sha_invalid');
  assert(observedSha === releaseSha, 'release_sha_not_exact_current_execution');
  assert(/^\d+$/.test(runId), 'recovery_run_id_invalid');

  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  assert(evidence?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup_restore_schema_invalid');
  assert(evidence?.evidenceItem === 'backup-restore-tested', 'backup_restore_evidence_item_invalid');
  assert(evidence?.status === 'Complete' && evidence?.outcome === 'passed', 'backup_restore_not_complete_passed');
  assert(evidence?.targetSha === releaseSha && evidence?.observedSha === releaseSha, 'backup_restore_sha_mismatch');
  assert(String(evidence?.runId ?? '') === runId, 'backup_restore_run_id_mismatch');

  const sourceMigrationLedger = captureSourceLedger(source);
  evidence.checks = {
    ...evidence.checks,
    sourceMigrationLedgerCaptured: true,
  };
  evidence.integrity = {
    ...evidence.integrity,
    sourceMigrationLedger,
  };
  evidence.evidenceIntegrity = {
    ...evidence.evidenceIntegrity,
    migrationVersionsStored: false,
    sourceMigrationLedgerDigestStored: true,
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    sourceMigrationLedgerCount: sourceMigrationLedger.count,
    sourceMigrationLedgerHead: sourceMigrationLedger.head,
    sourceMigrationLedgerDigestStored: true,
    migrationVersionsStored: false,
  })}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
