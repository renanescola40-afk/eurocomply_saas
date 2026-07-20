#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const output = 'docs/security/evidence/p1/backup-restore-tested.json';
const workDir = 'artifacts/recovery-exercise';
const dumpPath = `${workDir}/production-backup.dump`;
const env = (name) => String(process.env[name] ?? '').trim();
const startedAt = Date.now();
const checks = {};
const failures = [];

function required(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}
function run(command, args, extraEnv = {}) {
  return execFileSync(command, args, { stdio: 'pipe', timeout: 15 * 60_000, env: { ...process.env, ...extraEnv } }).toString('utf8');
}
function sql(connection, statement) {
  return run('psql', [connection, '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', statement]).trim();
}

const source = required('RECOVERY_SOURCE_DATABASE_URL');
const restore = required('RECOVERY_ISOLATED_DATABASE_URL');
const expectedSha = required('GITHUB_SHA');
checks.protectedMainExecution = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';
checks.distinctDatabases = Boolean(source && restore && source !== restore);
checks.exactShaBound = /^[a-f0-9]{40}$/i.test(expectedSha);
if (!Object.values(checks).every(Boolean)) failures.push('preconditions_failed');

mkdirSync(workDir, { recursive: true });
let backupCompletedAt = null;
let restoreCompletedAt = null;
let digest = null;
let sourceCounts = {};
let restoredCounts = {};
const criticalTables = ['organizations', 'organization_members', 'audit_logs'];

try {
  if (failures.length) throw new Error('recovery_preconditions_failed');
  run('pg_dump', [source, '--format=custom', '--no-owner', '--no-privileges', '--file', dumpPath]);
  backupCompletedAt = new Date().toISOString();
  checks.backupExists = statSync(dumpPath).size > 0;
  digest = createHash('sha256').update(readFileSync(dumpPath)).digest('hex');

  run('pg_restore', ['--dbname', restore, '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', dumpPath]);
  restoreCompletedAt = new Date().toISOString();
  checks.restoreExecuted = true;

  for (const table of criticalTables) {
    sourceCounts[table] = Number(sql(source, `select count(*) from public.${table};`));
    restoredCounts[table] = Number(sql(restore, `select count(*) from public.${table};`));
  }
  checks.dataIntegrity = criticalTables.every((table) => sourceCounts[table] === restoredCounts[table]);

  const rlsRows = Number(sql(restore, "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_members','audit_logs') and c.relrowsecurity=true;"));
  checks.rlsAfterRestore = rlsRows === criticalTables.length;
  const policyCount = Number(sql(restore, "select count(*) from pg_policies where schemaname='public' and tablename in ('organizations','organization_members','audit_logs');"));
  checks.rlsPoliciesPresent = policyCount >= criticalTables.length;

  checks.backupExists = checks.backupExists === true;
  checks.rpoMeasured = Boolean(backupCompletedAt);
  checks.rtoMeasured = Boolean(restoreCompletedAt);
  if (!Object.values(checks).every(Boolean)) failures.push('one_or_more_recovery_checks_failed');
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_recovery_failure');
} finally {
  rmSync(dumpPath, { force: true });
}

const finishedAt = Date.now();
const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.backup-restore-evidence.v1',
  evidenceItem: 'backup-restore-tested',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  repository: env('GITHUB_REPOSITORY'),
  branch: env('GITHUB_REF_NAME'),
  targetSha: expectedSha || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks,
  metrics: {
    rpoSeconds: backupCompletedAt ? Math.max(0, Math.round((Date.now() - Date.parse(backupCompletedAt)) / 1000)) : null,
    rtoSeconds: restoreCompletedAt ? Math.round((Date.parse(restoreCompletedAt) - startedAt) / 1000) : null,
    totalExerciseSeconds: Math.round((finishedAt - startedAt) / 1000),
  },
  integrity: { criticalTables, sourceCounts, restoredCounts, backupSha256Prefix: digest ? `${digest.slice(0, 16)}…` : null },
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    exactShaBound: checks.exactShaBound === true,
    databaseUrlsStored: false,
    dumpStored: false,
    rowDataStored: false,
    credentialsStored: false,
  },
  boundary: 'Logical backup and restore were executed against a dedicated isolated recovery database. Evidence stores only aggregate counts and a truncated digest; the dump is deleted before completion.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
