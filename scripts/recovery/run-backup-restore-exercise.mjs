#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, fstatSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import { databaseUrlUsesPort, isLoopbackDatabaseUrl } from './manage-ephemeral-recovery-database.mjs';
import { buildRecoveryCommandDiagnostic } from './recovery-command-observability.mjs';
import { extensionParitySatisfied, planExtensionParity } from './recovery-extension-parity.mjs';

const output = 'docs/security/evidence/p1/backup-restore-tested.json';
const workDir = 'artifacts/recovery-exercise';
const legacyDumpPath = `${workDir}/production-backup.dump`;
const rolesDumpPath = `${workDir}/production-roles.sql`;
const schemaDumpPath = `${workDir}/production-schema.sql`;
const dataDumpPath = `${workDir}/production-data.sql`;
const managedStoragePrimer = 'scripts/recovery/prime-ephemeral-managed-storage-schema.mjs';
const env = (name) => String(process.env[name] ?? '').trim();
const startedAt = Date.now();
const checks = {};
const failures = [];
let failurePhase = null;
let failureDiagnostic = null;

function required(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}

function postgresConnection(name) {
  const raw = String(process.env[name] ?? '');
  if (!raw.trim()) {
    failures.push(`missing_${name.toLowerCase()}`);
    return '';
  }

  const normalized = raw.replace(/[\r\n]+/g, '').trim();
  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    failures.push(`invalid_${name.toLowerCase()}_control_character`);
    return '';
  }

  try {
    const parsed = new URL(normalized);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
      failures.push(`invalid_${name.toLowerCase()}_postgres_url`);
      return '';
    }
  } catch {
    failures.push(`invalid_${name.toLowerCase()}_postgres_url`);
    return '';
  }

  return normalized;
}

function run(command, args, extraEnv = {}, failureCode = `command_${command}_failed`) {
  try {
    return execFileSync(command, args, {
      stdio: 'pipe',
      timeout: 15 * 60_000,
      env: { ...process.env, ...extraEnv },
    }).toString('utf8');
  } catch (error) {
    if (!failureDiagnostic) {
      failureDiagnostic = buildRecoveryCommandDiagnostic({ error, phase: failurePhase, command });
    }
    throw new Error(failureCode);
  }
}

function sql(connection, statement, failureCode = 'recovery_validation_query_failed') {
  return run(
    'psql',
    [connection, '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', statement],
    {},
    failureCode,
  ).trim();
}

function parseInventoryJson(value, failureCode) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('not_array');
    return parsed;
  } catch {
    throw new Error(failureCode);
  }
}

function readManagedStorageRelations(connection) {
  const failureCode = 'recovery_source_storage_relation_inventory_failed';
  const payload = sql(
    connection,
    `select coalesce(json_agg((n.nspname || '.' || c.relname) order by c.relname)::text, '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'storage' and c.relkind in ('r','p','f','S','m');`,
    failureCode,
  );
  const relations = parseInventoryJson(payload, failureCode).map((value) => String(value ?? '').trim());
  if (!relations.includes('storage.buckets') || !relations.includes('storage.objects')) throw new Error('recovery_source_storage_relation_inventory_incomplete');
  if (relations.some((value) => !/^storage\.[a-z0-9_]+$/.test(value))) throw new Error('recovery_source_storage_relation_inventory_unsafe');
  return [...new Set(relations)].sort();
}

function readManagedAuthTables(connection, boundary) {
  const failureCode = `recovery_${boundary}_auth_relation_inventory_failed`;
  const payload = sql(
    connection,
    `select coalesce(json_agg((n.nspname || '.' || c.relname) order by c.relname)::text, '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'auth' and c.relkind in ('r','p','f');`,
    failureCode,
  );
  const relations = parseInventoryJson(payload, failureCode).map((value) => String(value ?? '').trim());
  if (!relations.includes('auth.users')) throw new Error(`recovery_${boundary}_auth_relation_inventory_incomplete`);
  if (relations.some((value) => !/^auth\.[a-z0-9_]+$/.test(value))) throw new Error(`recovery_${boundary}_auth_relation_inventory_unsafe`);
  return [...new Set(relations)].sort();
}

function planManagedAuthDataBoundary(sourceConnection, targetConnection) {
  const sourceRelations = readManagedAuthTables(sourceConnection, 'source');
  const targetRelations = readManagedAuthTables(targetConnection, 'target');
  const targetSet = new Set(targetRelations);
  const sourceOnlyEmptyRelations = [];

  for (const relation of sourceRelations) {
    if (targetSet.has(relation)) continue;
    const rowCount = Number(sql(sourceConnection, `select count(*) from ${relation};`, 'recovery_source_auth_relation_count_failed'));
    if (!Number.isSafeInteger(rowCount) || rowCount < 0) throw new Error('recovery_source_auth_relation_count_invalid');
    if (rowCount > 0) throw new Error('recovery_target_managed_auth_relation_missing_with_data');
    sourceOnlyEmptyRelations.push(relation);
  }

  return {
    sourceRelationCount: sourceRelations.length,
    targetRelationCount: targetRelations.length,
    sourceOnlyEmptyRelationCount: sourceOnlyEmptyRelations.length,
    sourceOnlyEmptyRelations,
  };
}

function readInstalledExtensions(connection, failureCode) {
  const payload = sql(connection, `select coalesce(json_agg(json_build_object('name', e.extname, 'schema', n.nspname, 'version', e.extversion) order by e.extname)::text, '[]') from pg_extension e join pg_namespace n on n.oid = e.extnamespace;`, failureCode);
  return parseInventoryJson(payload, failureCode);
}

function readAvailableExtensions(connection) {
  const payload = sql(connection, `select coalesce(json_agg(json_build_object('name', v.name, 'version', v.version, 'relocatable', v.relocatable, 'schema', v.schema) order by v.name, v.version)::text, '[]') from pg_available_extension_versions v;`, 'recovery_target_available_extensions_query_failed');
  return parseInventoryJson(payload, 'recovery_target_available_extensions_invalid');
}

function safeFailureCode(error) {
  const message = error instanceof Error ? error.message : '';
  if (/^[a-z0-9_:-]{1,160}$/i.test(message)) return message;
  return failurePhase ? `recovery_${failurePhase}_failed` : 'unknown_recovery_failure';
}

function inspectFile(path) {
  const descriptor = openSync(path, 'r');
  try {
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.size <= 0) return { exists: false, digest: null, bytes: 0 };
    const bytes = readFileSync(descriptor);
    return { exists: bytes.length === metadata.size && bytes.length > 0, digest: createHash('sha256').update(bytes).digest('hex'), bytes: metadata.size };
  } finally {
    closeSync(descriptor);
  }
}

function inspectLogicalBackup(paths) {
  const inspected = paths.map(inspectFile);
  const exists = inspected.every((entry) => entry.exists && entry.digest);
  const digest = exists ? createHash('sha256').update(inspected.map((entry) => entry.digest).join(':')).digest('hex') : null;
  return { exists, digest, bytes: inspected.reduce((sum, entry) => sum + entry.bytes, 0) };
}

function assertManagedStorageRowsExcluded(path) {
  const dump = readFileSync(path, 'utf8');
  if (/^COPY\s+"?storage"?\./mi.test(dump)) throw new Error('recovery_storage_rows_present_in_data_dump');
}

function assertManagedAuthRowsExcluded(path, relations) {
  const dump = readFileSync(path, 'utf8');
  for (const relation of relations) {
    const [, table] = relation.split('.');
    const copyPattern = new RegExp(`^COPY\\s+"?auth"?\\."?${table}"?(?:\\s|\\()`, 'mi');
    if (copyPattern.test(dump)) throw new Error('recovery_managed_auth_rows_present_in_data_dump');
  }
}

function copySqlToContainer(container, path) {
  const containerPath = `/tmp/${basename(path)}`;
  run('docker', ['cp', path, `${container}:${containerPath}`], {}, 'recovery_copy_dump_to_isolated_target_failed');
  return containerPath;
}

function restoreIntoEphemeralSupabase(container) {
  const containerPaths = [copySqlToContainer(container, rolesDumpPath), copySqlToContainer(container, schemaDumpPath), copySqlToContainer(container, dataDumpPath)];
  try {
    run('docker', [
      'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '--no-psqlrc',
      '--single-transaction', '--set', 'ON_ERROR_STOP=1',
      '--file', containerPaths[0],
      '--file', containerPaths[1],
      '--command', 'SET session_replication_role = replica;',
      '--file', containerPaths[2],
    ], {}, 'recovery_isolated_restore_failed');
  } finally {
    for (const path of containerPaths) {
      try { run('docker', ['exec', container, 'rm', '-f', path], {}, 'recovery_isolated_cleanup_failed'); } catch {}
    }
  }
}

const source = postgresConnection('RECOVERY_SOURCE_DATABASE_URL');
const restore = postgresConnection('RECOVERY_ISOLATED_DATABASE_URL');
const targetSha = required('RELEASE_SHA');
const observedSha = required('GITHUB_SHA');
const localContainer = env('RECOVERY_LOCAL_DB_CONTAINER');
const localHostPort = Number(env('RECOVERY_LOCAL_DB_HOST_PORT'));
const ephemeralMode = env('RECOVERY_EPHEMERAL_DATABASE_PROVISIONED') === 'true' && Boolean(localContainer);
checks.protectedMainExecution = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';
checks.distinctDatabases = Boolean(source && restore && source !== restore);
checks.exactShaBound = /^[a-f0-9]{40}$/.test(targetSha) && observedSha === targetSha;
checks.isolatedTarget = ephemeralMode
  ? Number.isInteger(localHostPort) && localHostPort > 0 && localHostPort <= 65535 && isLoopbackDatabaseUrl(restore) && databaseUrlUsesPort(restore, localHostPort)
  : Boolean(restore);
checks.connectionStringsSanitized = Boolean(source && restore);
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
const managedAuthBoundary = { sourceRelationCount: null, targetRelationCount: null, sourceOnlyEmptyRelationCount: null };
const extensionParity = { sourceCount: null, targetInitialCount: null, enabledCount: null, targetFinalCount: null };

try {
  if (failures.length) throw new Error('recovery_preconditions_failed');

  if (ephemeralMode) {
    failurePhase = 'managed_storage_schema_prime';
    run(process.execPath, [managedStoragePrimer], { RECOVERY_MANAGED_SCHEMA_PRIME_PHASE: 'pre-production-restore' }, 'recovery_managed_storage_schema_prime_failed');
    checks.managedStorageSchemaPrimed = true;

    failurePhase = 'managed_storage_relation_inventory';
    const managedStorageDataExclude = readManagedStorageRelations(source).join(',');
    checks.managedStorageRelationInventory = true;

    failurePhase = 'roles_dump';
    run('supabase', ['db', 'dump', '--db-url', source, '--role-only', '--file', rolesDumpPath], {}, 'recovery_roles_dump_failed');
    failurePhase = 'schema_dump';
    run('supabase', ['db', 'dump', '--db-url', source, '--file', schemaDumpPath], {}, 'recovery_schema_dump_failed');

    // Any target mutation that can affect managed catalog shape must finish before
    // the Auth data boundary is planned. The protected run proved that planning
    // Auth before extension parity can leave a stale target relation inventory.
    failurePhase = 'extension_parity';
    const sourceExtensions = readInstalledExtensions(source, 'recovery_source_extensions_query_failed');
    const targetExtensions = readInstalledExtensions(restore, 'recovery_target_extensions_query_failed');
    const availableExtensions = readAvailableExtensions(restore);
    const extensionPlan = planExtensionParity(sourceExtensions, targetExtensions, availableExtensions);
    extensionParity.sourceCount = extensionPlan.source.length;
    extensionParity.targetInitialCount = extensionPlan.target.length;
    extensionParity.enabledCount = extensionPlan.enable.length;
    if (extensionPlan.unavailableVersions.length > 0) throw new Error('recovery_target_extension_version_unavailable');
    if (extensionPlan.schemaMismatches.length > 0) throw new Error('recovery_target_extension_schema_mismatch');
    if (extensionPlan.versionMismatches.length > 0) throw new Error('recovery_target_extension_version_mismatch');
    for (const entry of extensionPlan.enable) sql(restore, entry.sql, 'recovery_target_extension_enable_failed');
    const finalTargetExtensions = readInstalledExtensions(restore, 'recovery_target_extensions_recheck_failed');
    extensionParity.targetFinalCount = finalTargetExtensions.length;
    checks.extensionParity = extensionParitySatisfied(sourceExtensions, finalTargetExtensions);
    if (!checks.extensionParity) throw new Error('recovery_target_extension_parity_failed');

    failurePhase = 'managed_auth_relation_inventory';
    const managedAuthPlan = planManagedAuthDataBoundary(source, restore);
    managedAuthBoundary.sourceRelationCount = managedAuthPlan.sourceRelationCount;
    managedAuthBoundary.targetRelationCount = managedAuthPlan.targetRelationCount;
    managedAuthBoundary.sourceOnlyEmptyRelationCount = managedAuthPlan.sourceOnlyEmptyRelationCount;
    checks.managedAuthRelationInventory = true;
    checks.managedAuthSchemaDriftSafe = true;
    const managedAuthDataExclude = managedAuthPlan.sourceOnlyEmptyRelations.join(',');
    const managedDataExclude = [managedStorageDataExclude, managedAuthDataExclude].filter(Boolean).join(',');

    failurePhase = 'data_dump';
    run('supabase', ['db', 'dump', '--db-url', source, '--data-only', '--use-copy', '--exclude', managedDataExclude, '--file', dataDumpPath], {}, 'recovery_data_dump_failed');
    failurePhase = 'data_dump_managed_exclusion_validation';
    assertManagedStorageRowsExcluded(dataDumpPath);
    assertManagedAuthRowsExcluded(dataDumpPath, managedAuthPlan.sourceOnlyEmptyRelations);
    checks.managedStorageRowsExcluded = true;
    checks.managedAuthRowsExcluded = true;
    backupCompletedAt = new Date().toISOString();

    failurePhase = 'backup_inspection';
    const inspectedDump = inspectLogicalBackup([rolesDumpPath, schemaDumpPath, dataDumpPath]);
    checks.backupExists = inspectedDump.exists;
    digest = inspectedDump.digest;
    backupBytes = inspectedDump.bytes;
    if (!checks.backupExists || !digest) throw new Error('backup_dump_invalid');

    failurePhase = 'isolated_restore';
    restoreIntoEphemeralSupabase(localContainer);
  } else {
    failurePhase = 'legacy_dump';
    run('pg_dump', [source, '--format=custom', '--no-owner', '--no-privileges', '--file', legacyDumpPath], {}, 'recovery_legacy_dump_failed');
    backupCompletedAt = new Date().toISOString();
    failurePhase = 'backup_inspection';
    const inspectedDump = inspectFile(legacyDumpPath);
    checks.backupExists = inspectedDump.exists;
    digest = inspectedDump.digest;
    backupBytes = inspectedDump.bytes;
    if (!checks.backupExists || !digest) throw new Error('backup_dump_invalid');
    failurePhase = 'legacy_restore';
    run('pg_restore', ['--dbname', restore, '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', legacyDumpPath], {}, 'recovery_legacy_restore_failed');
  }

  restoreCompletedAt = new Date().toISOString();
  checks.restoreExecuted = true;
  failurePhase = 'integrity_counts';
  for (const table of criticalTables) {
    sourceCounts[table] = Number(sql(source, `select count(*) from public.${table};`, `recovery_source_${table}_count_failed`));
    restoredCounts[table] = Number(sql(restore, `select count(*) from public.${table};`, `recovery_restored_${table}_count_failed`));
  }
  checks.dataIntegrity = criticalTables.every((table) => sourceCounts[table] === restoredCounts[table]);
  sourceAuthUsers = Number(sql(source, 'select count(*) from auth.users;', 'recovery_source_auth_users_count_failed'));
  restoredAuthUsers = Number(sql(restore, 'select count(*) from auth.users;', 'recovery_restored_auth_users_count_failed'));
  checks.authUsersIntegrity = sourceAuthUsers === restoredAuthUsers;
  failurePhase = 'rls_validation';
  const rlsRows = Number(sql(restore, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_members','audit_logs') and c.relrowsecurity=true;", 'recovery_restored_rls_count_failed'));
  checks.rlsAfterRestore = rlsRows === criticalTables.length;
  const policyCount = Number(sql(restore, "select count(*) from pg_policies where schemaname='public' and tablename in ('organizations','organization_members','audit_logs');", 'recovery_restored_policy_count_failed'));
  checks.rlsPoliciesPresent = policyCount >= criticalTables.length;
  checks.backupExists = checks.backupExists === true;
  checks.rpoMeasured = Boolean(backupCompletedAt);
  checks.rtoMeasured = Boolean(restoreCompletedAt);
  if (!Object.values(checks).every(Boolean)) failures.push('one_or_more_recovery_checks_failed');
  failurePhase = null;
} catch (error) {
  failures.push(safeFailureCode(error));
} finally {
  for (const path of [legacyDumpPath, rolesDumpPath, schemaDumpPath, dataDumpPath]) rmSync(path, { force: true });
}

const finishedAt = Date.now();
const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.backup-restore-evidence.v2', evidenceItem: 'backup-restore-tested', status: passed ? 'Complete' : 'Open', outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(), repository: env('GITHUB_REPOSITORY'), branch: env('GITHUB_REF_NAME'), targetSha: targetSha || null, observedSha: observedSha || null,
  runId: env('GITHUB_RUN_ID') || null, controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'], checks,
  metrics: { rpoSeconds: backupCompletedAt ? Math.max(0, Math.round((Date.now() - Date.parse(backupCompletedAt)) / 1000)) : null, rtoSeconds: restoreCompletedAt ? Math.round((Date.parse(restoreCompletedAt) - startedAt) / 1000) : null, totalExerciseSeconds: Math.round((finishedAt - startedAt) / 1000), backupBytes },
  integrity: { criticalTables, sourceCounts, restoredCounts, sourceAuthUsers, restoredAuthUsers, managedAuthBoundary, extensionParity, backupSha256Prefix: digest ? `${digest.slice(0, 16)}…` : null, recoveryMode: ephemeralMode ? 'ephemeral-supabase-postgres' : 'external-isolated-database' }, failures: [...new Set(failures)], failurePhase: passed ? null : failurePhase,
  failureDiagnostic: passed ? null : failureDiagnostic,
  evidenceIntegrity: { containsSensitiveValues: false, exactShaBound: checks.exactShaBound === true, databaseUrlsStored: false, dumpStored: false, rowDataStored: false, credentialsStored: false, commandArgumentsStored: false, rawErrorMessagesStored: false, extensionNamesStored: false, extensionVersionsStored: false, managedAuthRelationNamesStored: false, connectionStringsNormalizedBeforeUse: checks.connectionStringsSanitized === true, singleDescriptorInspection: !ephemeralMode, logicalBackupFilesDeleted: true },
  evidenceBoundary: ephemeralMode
    ? 'Supabase-managed Auth/REST/Storage relations were primed on the empty isolated target by the local Supabase runtime and all API services were stopped before any Production snapshot restore. Supabase-compatible logical roles and application schema are captured first; exact extension parity is then established on the disposable DB-only target before the provider-managed Auth relation inventory is planned immediately ahead of the data dump. Storage row data is excluded from this backup/restore proof. Provider-managed Auth relations that exist only in the Production source are excluded from data replay only when their source row count is zero; any non-empty source-only Auth relation fails closed, and auth.users row-count integrity remains mandatory. Selected migration postconditions and later Storage runtime/tenant acceptance remain mandatory. Evidence stores only aggregate counts, safe failure codes, a redacted process-failure classification and a truncated combined digest; managed Auth relation names, extension names/versions, connection strings, raw command arguments, raw process errors, backup files and local database volumes are not retained.'
    : 'Logical backup and restore were executed against a dedicated isolated recovery database. Evidence stores only aggregate counts, safe failure codes, a redacted process-failure classification and a truncated digest; connection strings, raw command arguments, raw process errors and the dump are not retained.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) {
  console.error(JSON.stringify({ outcome: evidence.outcome, failureDiagnostic: evidence.failureDiagnostic, failures: evidence.failures }, null, 2));
  process.exit(1);
}
