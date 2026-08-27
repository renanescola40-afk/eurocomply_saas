import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECOVERY_DB_PORT,
  DEFAULT_RECOVERY_DB_URL,
  RECOVERY_DYNAMIC_PORT_ATTEMPTS,
  RECOVERY_DYNAMIC_PORT_MIN,
  RECOVERY_DYNAMIC_PORT_SPAN,
  RECOVERY_EXPECTED_SERVER_PREFIX,
  RECOVERY_POSTGRES_MAJOR_VERSION,
  RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION,
  buildProjectId,
  buildRecoveryDbUrl,
  classifyPublishedBinding,
  configurePostgresMajorVersion,
  configureRecoveryDatabase,
  databaseUrlUsesPort,
  isLoopbackDatabaseUrl,
  normalizeSupabasePostgresImageVersion,
  parseLocalDbUrl,
  parseSupabasePostgresImageVersion,
  readConfiguredDatabasePort,
  readConfiguredPostgresMajorVersion,
  recoveryPostgresVersionPinPath,
  selectRecoveryHostPort,
} from '../../scripts/recovery/manage-ephemeral-recovery-database.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const finalTechnical = fs.readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

describe('ephemeral Supabase recovery database contract', () => {
  it('pins the exact production Supabase Postgres image plus PostgreSQL 17 and an isolated per-run host port', () => {
    expect(RECOVERY_POSTGRES_MAJOR_VERSION).toBe(17);
    expect(RECOVERY_EXPECTED_SERVER_PREFIX).toBe('17.6');
    expect(RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION).toBe('17.6.1.127');
    expect(DEFAULT_RECOVERY_DB_PORT).toBe(54322);
    expect(DEFAULT_RECOVERY_DB_URL).toBe('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

    const configured = configureRecoveryDatabase('[db]\nport = 54322\nmajor_version = 15\n', 31873);
    expect(readConfiguredPostgresMajorVersion(configured)).toBe(17);
    expect(readConfiguredDatabasePort(configured)).toBe(31873);
    expect(configured).toContain('major_version = 17');
    expect(configured).toContain('port = 31873');
    expect(() => configurePostgresMajorVersion('[db]\nport = 54322\n')).toThrow('db.major_version');
    expect(() => configureRecoveryDatabase('[db]\nmajor_version = 17\n', 31873)).toThrow('db.port');
    expect(manager).toContain('observedServerVersion.startsWith(RECOVERY_EXPECTED_SERVER_PREFIX)');
  });

  it('writes and verifies the full Supabase image version instead of trusting the CLI default image', () => {
    expect(normalizeSupabasePostgresImageVersion('17.6.1.127')).toBe('17.6.1.127');
    expect(() => normalizeSupabasePostgresImageVersion('17.6')).toThrow('full x.y.z.build format');
    expect(() => normalizeSupabasePostgresImageVersion('16.4.1.127')).toThrow('must remain on 17.6.x');
    expect(recoveryPostgresVersionPinPath('/tmp/recovery')).toBe('/tmp/recovery/supabase/.temp/postgres-version');

    expect(parseSupabasePostgresImageVersion('public.ecr.aws/supabase/postgres:17.6.1.127')).toBe('17.6.1.127');
    expect(parseSupabasePostgresImageVersion('ghcr.io/supabase/postgres:17.6.1.127')).toBe('17.6.1.127');
    expect(parseSupabasePostgresImageVersion('supabase/postgres:17.6.1.127')).toBe('17.6.1.127');
    expect(parseSupabasePostgresImageVersion('supabase/postgres:latest')).toBeNull();

    expect(manager).toContain("writeFileSync(recoveryPostgresVersionPinPath(workDir), `${normalized}\\n`, { mode: 0o600 })");
    expect(manager).toContain("run('supabase', ['--workdir', workDir, 'init', '--force'])");
    expect(manager.indexOf('writeRecoveryPostgresImagePin(workDir)'))
      .toBeLessThan(manager.indexOf("run('supabase', ['--workdir', workDir, 'db', 'start'])"));
    expect(manager).toContain("run('docker', ['inspect', '--format', '{{.Config.Image}}', containerName]");
    expect(manager).toContain('observedPostgresImageVersion !== expectedPostgresImageVersion');
    expect(manager).toContain("appendGithubEnv('RECOVERY_SUPABASE_POSTGRES_VERSION', expectedPostgresImageVersion)");
  });

  it('selects a bounded deterministic free port and skips occupied candidates', () => {
    const first = selectRecoveryHostPort('12345', '2', []);
    expect(first).toBeGreaterThanOrEqual(RECOVERY_DYNAMIC_PORT_MIN);
    expect(first).toBeLessThan(RECOVERY_DYNAMIC_PORT_MIN + RECOVERY_DYNAMIC_PORT_SPAN);
    expect(selectRecoveryHostPort('12345', '2', [])).toBe(first);
    const occupied = Array.from({ length: RECOVERY_DYNAMIC_PORT_ATTEMPTS - 1 }, (_, index) =>
      RECOVERY_DYNAMIC_PORT_MIN + ((first - RECOVERY_DYNAMIC_PORT_MIN + index) % RECOVERY_DYNAMIC_PORT_SPAN));
    const selected = selectRecoveryHostPort('12345', '2', occupied);
    expect(occupied).not.toContain(selected);
    expect(manager).toContain("run('ss', ['-H', '-ltn']");
    expect(manager).toContain('listeningTcpPorts()');
  });

  it('accepts only loopback connection URLs and validates the selected host port', () => {
    const dynamicUrl = buildRecoveryDbUrl(31873);
    expect(dynamicUrl).toBe('postgresql://postgres:postgres@127.0.0.1:31873/postgres');
    expect(isLoopbackDatabaseUrl(dynamicUrl)).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@localhost:31873/postgres')).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@db.example.com:31873/postgres')).toBe(false);
    expect(isLoopbackDatabaseUrl('not-a-url')).toBe(false);
    expect(databaseUrlUsesPort(dynamicUrl, 31873)).toBe(true);
    expect(databaseUrlUsesPort(dynamicUrl, 31874)).toBe(false);
  });

  it('classifies Docker bindings against the selected host port and fails closed on mismatches', () => {
    expect(classifyPublishedBinding('127.0.0.1:31873', 31873)).toBe('loopback');
    expect(classifyPublishedBinding('[::1]:31873', 31873)).toBe('loopback');
    expect(classifyPublishedBinding('0.0.0.0:31873', 31873)).toBe('wildcard-v4');
    expect(classifyPublishedBinding('[::]:31873', 31873)).toBe('wildcard-v6');
    expect(classifyPublishedBinding('10.0.0.4:31873', 31873)).toBe('invalid');
    expect(classifyPublishedBinding('0.0.0.0:54322', 31873)).toBe('invalid');
  });

  it('installs host and Docker firewall rules using the selected host port before restored data is loaded', () => {
    expect(manager).toContain("ensureDockerUserChain('iptables')");
    expect(manager).toContain("firewallArgs('INPUT', hostPort, comment)");
    expect(manager).toContain('dockerUserArgs(DB_CONTAINER_PORT, comment)');
    expect(manager).toContain("installRule('iptables', input)");
    expect(manager).toContain("installRule('iptables', dockerUser)");
    expect(manager).toContain("installRule('ip6tables', input6)");
    expect(manager).toContain('testLocalConnection(dbUrl)');
    expect(manager.indexOf('hardenWildcardBindings(containerName, projectId, hostPort)'))
      .toBeLessThan(manager.indexOf('testLocalConnection(dbUrl)'));
    expect(manager).toContain('cleanupPersistedFirewallRules');
    expect(manager).toContain('process.env.RECOVERY_LOCAL_DB_HOST_PORT');
    expect(manager).toContain("appendGithubEnv('RECOVERY_LOCAL_DB_HOST_PORT', String(hostPort))");
  });

  it('parses Supabase CLI env and pretty status formats without exposing the URL to evidence', () => {
    const dynamicUrl = buildRecoveryDbUrl(31873);
    expect(parseLocalDbUrl(`DB_URL=\"${dynamicUrl}\"\n`)).toBe(dynamicUrl);
    expect(parseLocalDbUrl(`DB URL: ${dynamicUrl}\n`)).toBe(dynamicUrl);
    expect(parseLocalDbUrl('API_URL=http://127.0.0.1:54321')).toBeNull();
    expect(manager).toContain('::add-mask::${dbUrl}');
    expect(manager).toContain("appendGithubEnv('RECOVERY_ISOLATED_DATABASE_URL', dbUrl)");
    expect(manager).toContain('parseLocalDbUrl(status) || buildRecoveryDbUrl(hostPort)');
  });

  it('derives bounded per-run project identifiers', () => {
    expect(buildProjectId('12345', '2')).toBe('risck-recovery-12345-2');
    expect(buildProjectId('12/../345', 'attempt 2')).toMatch(/^risck-recovery-[A-Za-z0-9_-]+$/);
    expect(buildProjectId('x'.repeat(200), '1').length).toBeLessThanOrEqual(63);
  });

  it('starts only the database service and destroys local volumes plus temporary firewall rules after proof', () => {
    expect(manager).toContain("'db', 'start'");
    expect(manager).not.toContain("'start', '--exclude'");
    expect(manager).toContain("'stop', '--no-backup'");
    expect(manager).toContain('local volumes, and temporary firewall rules removed');
    expect(finalTechnical).toMatch(/Remove disposable recovery database[\s\S]*?if: always\(\)/);

    expect(recovery).not.toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).toContain('Destroy isolated Supabase restore project');
    expect(recovery).toContain('destroy-supabase-provider-managed-restore.mjs');
    expect(recovery).toContain("if: always() && (inputs.exercise == 'full' || inputs.exercise == 'backup-restore')");
  });

  it('removes the persistent isolated database secret from protected workflows', () => {
    for (const workflow of [finalTechnical, recovery]) {
      expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    }

    expect(finalTechnical).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
    expect(finalTechnical).toContain('version: 2.101.0');
    expect(finalTechnical).toContain('Start exact-SHA disposable Supabase project database');

    expect(recovery).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(recovery).not.toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).toContain('verify-supabase-provider-managed-restore.mjs verify');
    expect(recovery).toContain('destroy-supabase-provider-managed-restore.mjs');
  });

  it('uses supported roles schema data dumps, excludes all managed Storage rows fail-closed and restores transactionally', () => {
    expect(exercise).toContain("'--role-only', '--file', rolesDumpPath");
    expect(exercise).toContain("failurePhase = 'application_schema_inventory'");
    expect(exercise).toContain('const applicationSchemas = readApplicationSchemas(source)');
    expect(exercise).toContain("const applicationSchemaCsv = applicationSchemas.join(',')");
    expect(exercise).toContain("run('supabase', ['db', 'dump', '--db-url', source, '--schema', applicationSchemaCsv, '--file', schemaDumpPath], {}, 'recovery_schema_dump_failed')");
    expect(exercise).not.toContain("run('supabase', ['db', 'dump', '--db-url', source, '--file', schemaDumpPath], {}, 'recovery_schema_dump_failed')");
    expect(exercise).toContain("'--data-only', '--use-copy'");
    expect(exercise).toContain('function readManagedStorageRelations(connection)');
    expect(exercise).toContain("relations.includes('storage.buckets')");
    expect(exercise).toContain("relations.includes('storage.objects')");
    expect(exercise).toContain("const managedStorageDataExclude = readManagedStorageRelations(source).join(',')");
    expect(exercise).not.toContain("SUPABASE_MANAGED_DATA_EXCLUDE = 'storage.*'");
    expect(exercise.match(/'--exclude'/g)).toHaveLength(1);
    expect(exercise).toContain("'--exclude', managedDataExclude");
    expect(exercise).toContain("failurePhase = 'data_dump_managed_exclusion_validation'");
    expect(exercise).toContain('assertManagedStorageRowsExcluded(dataDumpPath)');
    expect(exercise).toContain('checks.managedStorageRowsExcluded = true');
    expect(exercise).toContain('recovery_storage_rows_present_in_data_dump');
    expect(exercise).not.toContain("'--schema', 'public,app_private'");
    expect(exercise).toContain("run('docker', ['cp', path, `${container}:${containerPath}`], {}, 'recovery_copy_dump_to_isolated_target_failed')");
    expect(exercise).toContain("'--single-transaction', '--set', 'ON_ERROR_STOP=1'");
    expect(exercise).toContain("'--command', 'SET session_replication_role = replica;'");
    expect(exercise).toContain("criticalTables = ['organizations', 'organization_members', 'audit_logs']");
    expect(exercise).toContain("sourceAuthUsers = Number(sql(source, 'select count(*) from auth.users;', 'recovery_source_auth_users_count_failed'))");
    expect(exercise).toContain("restoredAuthUsers = Number(sql(restore, 'select count(*) from auth.users;', 'recovery_restored_auth_users_count_failed'))");
    expect(exercise).toContain('checks.authUsersIntegrity');
    expect(exercise).toContain('checks.rlsAfterRestore');
    expect(exercise).toContain('checks.rlsPoliciesPresent');
    expect(exercise).toContain('logicalBackupFilesDeleted: true');
  });

  it('preserves exact-SHA, database-isolation, rollback-confirmation and redaction boundaries', () => {
    expect(exercise).toContain('checks.distinctDatabases');
    expect(exercise).toContain('checks.exactShaBound');
    expect(exercise).toContain('databaseUrlsStored: false');
    expect(exercise).toContain('rowDataStored: false');
    expect(exercise).toContain('credentialsStored: false');
    expect(exercise).toContain('commandArgumentsStored: false');
    expect(exercise).toContain('rawErrorMessagesStored: false');
    expect(exercise).toContain('failures.push(safeFailureCode(error))');
    expect(recovery).toContain('EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK');
    expect(recovery).toContain('LAST_KNOWN_GOOD_COMMIT_SHA');
    expect(recovery).toContain('VERCEL_TOKEN');
  });
});
