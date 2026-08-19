#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidencePath = 'docs/security/evidence/p1/backup-restore-tested.json';
const forwardConfigPath = 'config/supabase-forward-reconciliation.json';
const VERSION = /^\d{14}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;
const SAFE_CONTAINER = /^supabase_db_risck-recovery-[A-Za-z0-9_-]{1,63}$/;
const RESTORE_PROOF_ROOT = '/tmp/risck-forward-postconditions';

const POSTCONDITION_FILES = [
  ['scripts/supabase/verify-forward-reconciliation-postconditions.sql', `${RESTORE_PROOF_ROOT}/supabase/verify-forward-reconciliation-postconditions.sql`],
  ['scripts/security/validate-enterprise-integrations-runtime.sql', `${RESTORE_PROOF_ROOT}/security/validate-enterprise-integrations-runtime.sql`],
  ['scripts/security/validate-enterprise-billing-runtime.sql', `${RESTORE_PROOF_ROOT}/security/validate-enterprise-billing-runtime.sql`],
  ['scripts/security/validate-live-rls-inventory-helper-boundary.sql', `${RESTORE_PROOF_ROOT}/security/validate-live-rls-inventory-helper-boundary.sql`],
];

function required(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const { capture = false, timeout = 60_000, ...execOptions } = options;
  return execFileSync(command, args, {
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout,
    shell: false,
    ...execOptions,
  });
}

function canonicalLedgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify(versions)).digest('hex')}`;
}

function captureSourceLedger(connection) {
  const output = run(
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
    { capture: true },
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
    versions,
    summary: {
      count: versions.length,
      head: versions.at(-1),
      sha256: canonicalLedgerDigest(versions),
    },
  };
}

function selectedForwardVersions() {
  const config = JSON.parse(readFileSync(forwardConfigPath, 'utf8'));
  assert(config?.schema === 'risck-comply.supabase-forward-reconciliation-config.v1', 'forward_reconciliation_config_invalid');
  assert(Array.isArray(config?.migrations) && config.migrations.length > 0, 'forward_reconciliation_selected_set_empty');
  const versions = config.migrations.map((item) => {
    const filename = String(item?.filename ?? '');
    const match = filename.match(/^(\d{14})_[a-z0-9_]+\.sql$/);
    assert(match, `forward_reconciliation_filename_invalid:${filename || 'missing'}`);
    return match[1];
  });
  assert(new Set(versions).size === versions.length, 'forward_reconciliation_selected_versions_duplicate');
  return [...versions].sort();
}

function validatePostconditionFilesExist() {
  for (const [hostPath] of POSTCONDITION_FILES) {
    const bytes = readFileSync(hostPath);
    assert(bytes.byteLength > 0 && bytes.byteLength <= 2 * 1024 * 1024, `forward_postcondition_file_invalid:${hostPath}`);
  }
}

function proveRestoredForwardPostconditions(container) {
  assert(SAFE_CONTAINER.test(container), 'recovery_local_container_identity_invalid');
  validatePostconditionFilesExist();
  run('docker', ['exec', container, 'mkdir', '-p', `${RESTORE_PROOF_ROOT}/supabase`, `${RESTORE_PROOF_ROOT}/security`]);
  try {
    for (const [hostPath, containerPath] of POSTCONDITION_FILES) {
      run('docker', ['cp', join(process.cwd(), hostPath), `${container}:${containerPath}`]);
    }
    run(
      'docker',
      [
        'exec',
        container,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '--no-psqlrc',
        '--set',
        'ON_ERROR_STOP=1',
        '--command',
        'begin transaction read only;',
        '--file',
        `${RESTORE_PROOF_ROOT}/supabase/verify-forward-reconciliation-postconditions.sql`,
        '--command',
        'rollback;',
      ],
      { timeout: 120_000 },
    );
    return true;
  } finally {
    try {
      run('docker', ['exec', container, 'rm', '-rf', RESTORE_PROOF_ROOT]);
    } catch {}
  }
}

function main() {
  const source = required('RECOVERY_SOURCE_DATABASE_URL').replace(/[\r\n]+/g, '').trim();
  const releaseSha = required('RELEASE_SHA').toLowerCase();
  const observedSha = required('GITHUB_SHA').toLowerCase();
  const runId = required('GITHUB_RUN_ID');
  const restoreContainer = required('RECOVERY_LOCAL_DB_CONTAINER');

  assert(FULL_SHA.test(releaseSha), 'release_sha_invalid');
  assert(observedSha === releaseSha, 'release_sha_not_exact_current_execution');
  assert(/^\d+$/.test(runId), 'recovery_run_id_invalid');

  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  assert(evidence?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup_restore_schema_invalid');
  assert(evidence?.evidenceItem === 'backup-restore-tested', 'backup_restore_evidence_item_invalid');
  assert(evidence?.status === 'Complete' && evidence?.outcome === 'passed', 'backup_restore_not_complete_passed');
  assert(evidence?.targetSha === releaseSha && evidence?.observedSha === releaseSha, 'backup_restore_sha_mismatch');
  assert(String(evidence?.runId ?? '') === runId, 'backup_restore_run_id_mismatch');

  const sourceLedger = captureSourceLedger(source);
  const selectedVersions = selectedForwardVersions();
  const sourceVersionSet = new Set(sourceLedger.versions);
  const selectedForwardSetPresentInSource = selectedVersions.every((version) => sourceVersionSet.has(version));
  let restoredPostconditionsExecuted = false;
  let restoredPostconditionsPassed = false;

  if (selectedForwardSetPresentInSource) {
    restoredPostconditionsExecuted = true;
    restoredPostconditionsPassed = proveRestoredForwardPostconditions(restoreContainer);
  }

  evidence.checks = {
    ...evidence.checks,
    sourceMigrationLedgerCaptured: true,
  };
  evidence.integrity = {
    ...evidence.integrity,
    sourceMigrationLedger: sourceLedger.summary,
  };
  evidence.forwardReconciliation = {
    selectedForwardMigrationCount: selectedVersions.length,
    selectedForwardSetPresentInSource,
    restoredPostconditionsExecuted,
    restoredPostconditionsPassed,
  };
  evidence.evidenceIntegrity = {
    ...evidence.evidenceIntegrity,
    migrationVersionsStored: false,
    sourceMigrationLedgerDigestStored: true,
    restoredPostconditionOutputStored: false,
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    sourceMigrationLedgerCount: sourceLedger.summary.count,
    sourceMigrationLedgerHead: sourceLedger.summary.head,
    sourceMigrationLedgerDigestStored: true,
    selectedForwardMigrationCount: selectedVersions.length,
    selectedForwardSetPresentInSource,
    restoredPostconditionsExecuted,
    restoredPostconditionsPassed,
    migrationVersionsStored: false,
    restoredPostconditionOutputStored: false,
  })}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
