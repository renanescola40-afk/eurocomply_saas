#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, fstatSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import { buildRecoveryCommandDiagnostic } from './recovery-command-observability.mjs';

const output = 'docs/security/evidence/p1/backup-restore-tested.json';
const workDir = 'artifacts/recovery-exercise';
const legacyDumpPath = `${workDir}/production-backup.dump`;
const rolesDumpPath = `${workDir}/production-roles.sql`;
const schemaDumpPath = `${workDir}/production-schema.sql`;
const dataDumpPath = `${workDir}/production-data.sql`;
const env = (name) => String(process.env[name] ?? '').trim();
const startedAt = Date.now();
const checks = {};
const failures = [];
let failureDiagnostic = null;

const SUPABASE_MANAGED_DATA_EXCLUDES = [
  'storage.buckets_vectors',
  'storage.vector_indexes',
];

function required(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}
function run(phase, command, args, extraEnv = {}) {
  try {
    return execFileSync(command, args, {
      stdio: 'pipe',
      timeout: 15 * 60_000,
      env: { ...process.env, ...extraEnv },
    }).toString('utf8');
  } catch (error) {
    const diagnostic = buildRecoveryCommandDiagnostic({ error, phase, command });
    if (!failureDiagnostic) failureDiagnostic = diagnostic;
    throw new Error(`recovery_command_failed:${diagnostic.phase}:${diagnostic.category}`);
  }
}
function runBestEffort(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore', timeout: 60_000, env: process.env });
  } catch {}
}
function sql(phase, connection, statement) {
  return run(phase, 'psql', [
    connection,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--set',
    'ON_ERROR_STOP=1',
    '--command',
    statement,
  ]).trim();
}
function inspectFile(path) {
  const descriptor = openSync(path, 'r');
  try {
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.size <= 0) return { exists: false, digest: null, bytes: 0 };
    const bytes = readFileSync(descriptor);
    return {
      exists: bytes.length === metadata.size && bytes.length > 0,
      digest: createHash('sha256').update(bytes).digest('hex'),
      bytes: metadata.size,
    };
  } finally {
    closeSync(descriptor);
  }
}
function inspectLogicalBackup(paths) {
  const inspected = paths.map(inspectFile);
  const exists = inspected.every((entry) => entry.exists && entry.digest);
  const digest = exists
    ? createHash('sha256').update(inspected.map((entry) => entry.digest).join(':')).digest('hex')
    : null;
  return { exists, digest, bytes: inspected.reduce((sum, entry) => sum + entry.bytes, 0) };
}
function copySqlToContainer(container, path, phase) {
  const containerPath = `/tmp/${basename(path)}`;
  run(phase, 'docker', ['cp', path, `${container}:${containerPath}`]);
  return containerPath;
}
function restoreIntoEphemeralSupabase(container) {
  const containerPaths = [
    copySqlToContainer(container, rolesDumpPath, 'restore_copy_roles'),
    copySqlToContainer(container, schemaDumpPath, 'restore_copy_schema'),
    copySqlToContainer(container, dataDumpPath, 'restore_copy_data'),
  ];
  try {
    run('restore_transaction', 'docker', [
      'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '--no-psqlrc',
      '--single-transaction', '--set', 'ON_ERROR_STOP=1',
      '--file', containerPaths[0],
      '--file', containerPaths[1],
      '--command', 'SET session_replication_role = replica;',
      '--file', containerPaths[2],
    ]);
  } finally {
    for (const path of containerPaths) {
      runBestEffort('docker', ['exec', container, 'rm', '-f', path]);
    }
  }
}

const source = required('RECOVERY_SOURCE_DATABASE_URL');
const restore = required('RECOVERY_ISOLATED_DATABASE_URL');
const targetSha = required('RELEASE_SHA');
const observedSha = required('GITHUB_SHA');
const localContainer = env('RECOVERY_LOCAL_DB_CONTAINER');
const ephemeralMode = env('RECOVERY_EPHEMERAL_DATABASE_PROVISIONED') === 'true' && Boolean(localContainer);
checks.protectedMainExecution = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';
checks.distinctDatabases = Boolean(source && restore && source !== restore);
checks.exactShaBound = /^[a-f0-9]{40}$/.test(targetSha) && observedSha === targetSha;
checks.isolatedTarget = ephemeralMode ? /^postgres(?:ql)?:\/\/[^@]*@(?:127\.0\.0\.1|localhost):54322\//.test(restore) : Boolean(restore);
if (!Object.values(checks).every(Boolean)) failures.push('preconditions_failed');

mkdirSync(workDir, { recursive: true });
let backupCompletedAt = null;
let restoreCompletedAt = null;
let digest = null;
let backupBytes = 0;
const sourceCounts = {};
const restoredCounts = {};
const criticalTables = ['organizations', 'organization_members', 'audit_logs'];
let sourceAuthUsers = null;
let restoredAuthUsers = null;

try {
  if (failures.length) throw new Error('recovery_preconditions_failed');

  if (ephemeralMode) {
    run('roles_dump', 'supabase', ['db', 'dump', '--db-url', source, '--role-only', '--file', rolesDumpPath]);
    run('schema_dump', 'supabase', ['db', 'dump', '--db-url', source, '--file', schemaDumpPath]);
    run('data_dump', 'supabase', [
      'db', 'dump', '--db-url', source,
      '--data-only', '--use-copy',
      '--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[0],
      '--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[1],
      '--file', dataDumpPath,
    ]);
    backupCompletedAt = new Date().toISOString();
    const inspectedDump = inspectLogicalBackup([rolesDumpPath, schemaDumpPath, dataDumpPath]);
    checks.backupExists = inspectedDump.exists;
    digest = inspectedDump.digest;
    backupBytes = inspectedDump.bytes;
    if (!checks.backupExists || !digest) throw new Error('backup_dump_invalid');
    restoreIntoEphemeralSupabase(localContainer);
  } else {
    run('legacy_dump', 'pg_dump', [source, '--format=custom', '--no-owner', '--no-privileges', '--file', legacyDumpPath]);
    backupCompletedAt = new Date().toISOString();
    const inspectedDump = inspectFile(legacyDumpPath);
    checks.backupExists = inspectedDump.exists;
    digest = inspectedDump.digest;
    backupBytes = inspectedDump.bytes;
    if (!checks.backupExists || !digest) throw new Error('backup_dump_invalid');
    run('legacy_restore', 'pg_restore', ['--dbname', restore, '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', legacyDumpPath]);
  }

  restoreCompletedAt = new Date().toISOString();
  checks.restoreExecuted = true;
  for (const table of criticalTables) {
    sourceCounts[table] = Number(sql(`source_count_${table}`, source, `select count(*) from public.${table};`));
    restoredCounts[table] = Number(sql(`restored_count_${table}`, restore, `select count(*) from public.${table};`));
  }
  checks.dataIntegrity = criticalTables.every((table) => sourceCounts[table] === restoredCounts[table]);
  sourceAuthUsers = Number(sql('source_auth_users_count', source, 'select count(*) from auth.users;'));
  restoredAuthUsers = Number(sql('restored_auth_users_count', restore, 'select count(*) from auth.users;'));
  checks.authUsersIntegrity = sourceAuthUsers === restoredAuthUsers;
  const rlsRows = Number(sql('restored_rls_check', restore, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_members','audit_logs') and c.relrowsecurity=true;"));
  checks.rlsAfterRestore = rlsRows === criticalTables.length;
  const policyCount = Number(sql('restored_policy_check', restore, "select count(*) from pg_policies where schemaname='public' and tablename in ('organizations','organization_members','audit_logs');"));
  checks.rlsPoliciesPresent = policyCount >= criticalTables.length;
  checks.backupExists = checks.backupExists === true;
  checks.rpoMeasured = Boolean(backupCompletedAt);
  checks.rtoMeasured = Boolean(restoreCompletedAt);
  if (!Object.values(checks).every(Boolean)) failures.push('one_or_more_recovery_checks_failed');
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_recovery_failure');
} finally {
  for (const path of [legacyDumpPath, rolesDumpPath, schemaDumpPath, dataDumpPath]) rmSync(path, { force: true });
}

const finishedAt = Date.now();
const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.backup-restore-evidence.v2',
  evidenceItem: 'backup-restore-tested',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  repository: env('GITHUB_REPOSITORY'),
  branch: env('GITHUB_REF_NAME'),
  targetSha: targetSha || null,
  observedSha: observedSha || null,
  runId: env('GITHUB_RUN_ID') || null,
  controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'],
  checks,
  failureDiagnostic,
  metrics: {
    rpoSeconds: backupCompletedAt ? Math.max(0, Math.round((Date.now() - Date.parse(backupCompletedAt)) / 1000)) : null,
    rtoSeconds: restoreCompletedAt ? Math.round((Date.parse(restoreCompletedAt) - startedAt) / 1000) : null,
    totalExerciseSeconds: Math.round((finishedAt - startedAt) / 1000),
    backupBytes,
  },
  integrity: {
    criticalTables,
    sourceCounts,
    restoredCounts,
    sourceAuthUsers,
    restoredAuthUsers,
    backupSha256Prefix: digest ? `${digest.slice(0, 16)}…` : null,
    recoveryMode: ephemeralMode ? 'ephemeral-supabase-postgres' : 'external-isolated-database',
  },
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    containsSensitiveValues: false,
    exactShaBound: checks.exactShaBound === true,
    databaseUrlsStored: false,
    dumpStored: false,
    rowDataStored: false,
    credentialsStored: false,
    commandArgumentsStored: false,
    rawCommandOutputStored: false,
    singleDescriptorInspection: !ephemeralMode,
    logicalBackupFilesDeleted: true,
  },
  evidenceBoundary: ephemeralMode
    ? 'Supabase-compatible logical roles, schema, and application/auth data backups were restored transactionally into a disposable isolated Supabase Postgres database; target-managed vector storage tables were excluded from the data dump. Evidence stores only aggregate counts, a redacted command-failure classification when needed, and a truncated combined digest; backup files and local database volumes are deleted by the protected workflow.'
    : 'Logical backup and restore were executed against a dedicated isolated recovery database. Evidence stores only aggregate counts, a redacted command-failure classification when needed, and a truncated digest; the dump is deleted before completion.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) {
  console.error(JSON.stringify({
    outcome: evidence.outcome,
    failureDiagnostic: evidence.failureDiagnostic,
    failures: evidence.failures,
  }, null, 2));
  process.exit(1);
}
