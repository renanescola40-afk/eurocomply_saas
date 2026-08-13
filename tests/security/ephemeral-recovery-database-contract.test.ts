import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECOVERY_DB_URL,
  RECOVERY_EXPECTED_SERVER_PREFIX,
  RECOVERY_POSTGRES_MAJOR_VERSION,
  buildProjectId,
  classifyPublishedBinding,
  configurePostgresMajorVersion,
  isLoopbackDatabaseUrl,
  parseLocalDbUrl,
  readConfiguredPostgresMajorVersion,
} from '../../scripts/recovery/manage-ephemeral-recovery-database.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const finalTechnical = fs.readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

describe('ephemeral Supabase recovery database contract', () => {
  it('pins the local project to PostgreSQL 17 and verifies the production 17.6 server line', () => {
    expect(RECOVERY_POSTGRES_MAJOR_VERSION).toBe(17);
    expect(RECOVERY_EXPECTED_SERVER_PREFIX).toBe('17.6');
    expect(DEFAULT_RECOVERY_DB_URL).toBe('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

    const configured = configurePostgresMajorVersion('[db]\nport = 54322\nmajor_version = 15\n');
    expect(readConfiguredPostgresMajorVersion(configured)).toBe(17);
    expect(configured).toContain('major_version = 17');
    expect(() => configurePostgresMajorVersion('[db]\nport = 54322\n')).toThrow('db.major_version');
    expect(manager).toContain('observedServerVersion.startsWith(RECOVERY_EXPECTED_SERVER_PREFIX)');
  });

  it('accepts only loopback connection URLs for the disposable target', () => {
    expect(isLoopbackDatabaseUrl(DEFAULT_RECOVERY_DB_URL)).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@localhost:54322/postgres')).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@db.example.com:54322/postgres')).toBe(false);
    expect(isLoopbackDatabaseUrl('not-a-url')).toBe(false);
  });

  it('classifies Docker bindings and fails closed on unexpected published endpoints', () => {
    expect(classifyPublishedBinding('127.0.0.1:54322')).toBe('loopback');
    expect(classifyPublishedBinding('[::1]:54322')).toBe('loopback');
    expect(classifyPublishedBinding('0.0.0.0:54322')).toBe('wildcard-v4');
    expect(classifyPublishedBinding('[::]:54322')).toBe('wildcard-v6');
    expect(classifyPublishedBinding('10.0.0.4:54322')).toBe('invalid');
    expect(classifyPublishedBinding('0.0.0.0:6543')).toBe('invalid');
  });

  it('installs host and Docker firewall rules before restored production data can be loaded', () => {
    expect(manager).toContain("ensureDockerUserChain('iptables')");
    expect(manager).toContain("firewallArgs('INPUT', DB_HOST_PORT, comment)");
    expect(manager).toContain('dockerUserArgs(DB_CONTAINER_PORT, comment)');
    expect(manager).toContain("installRule('iptables', input)");
    expect(manager).toContain("installRule('iptables', dockerUser)");
    expect(manager).toContain("installRule('ip6tables', input6)");
    expect(manager).toContain('testLocalConnection(dbUrl)');
    expect(manager.indexOf('hardenWildcardBindings(containerName, projectId)'))
      .toBeLessThan(manager.indexOf('testLocalConnection(dbUrl)'));
    expect(manager).toContain('cleanupPersistedFirewallRules');
  });

  it('parses Supabase CLI env and pretty status formats without exposing the URL to evidence', () => {
    expect(parseLocalDbUrl('DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"\n'))
      .toBe(DEFAULT_RECOVERY_DB_URL);
    expect(parseLocalDbUrl(`DB URL: ${DEFAULT_RECOVERY_DB_URL}\n`)).toBe(DEFAULT_RECOVERY_DB_URL);
    expect(parseLocalDbUrl('API_URL=http://127.0.0.1:54321')).toBeNull();
    expect(manager).toContain('::add-mask::${dbUrl}');
    expect(manager).toContain("appendGithubEnv('RECOVERY_ISOLATED_DATABASE_URL', dbUrl)");
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
    expect(recovery).toMatch(/Remove disposable recovery database[\s\S]*?if: always\(\) &&/);
  });

  it('removes the persistent isolated database secret from protected workflows', () => {
    for (const workflow of [finalTechnical, recovery]) {
      expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(workflow).toContain('supabase/setup-cli@46f89843689f213b433d85a0508d1183e1803070');
      expect(workflow).toContain('version: 2.101.0');
    }
    expect(finalTechnical).toContain('Start exact-SHA disposable Supabase project database');
    expect(recovery).toContain('Start disposable Supabase recovery database');
  });

  it('uses the supported Supabase roles schema data dump sequence and transactional local restore', () => {
    expect(exercise).toContain("'--role-only', '--file', rolesDumpPath");
    expect(exercise).toContain("run('supabase', ['db', 'dump', '--db-url', source, '--file', schemaDumpPath])");
    expect(exercise).toContain("'--data-only', '--use-copy', '--file', dataDumpPath");
    expect(exercise).not.toContain("'--schema', 'public,app_private'");
    expect(exercise).toContain("run('docker', ['cp', path, `${container}:${containerPath}`])");
    expect(exercise).toContain("'--single-transaction', '--set', 'ON_ERROR_STOP=1'");
    expect(exercise).toContain("'--command', 'SET session_replication_role = replica;'");
    expect(exercise).toContain("criticalTables = ['organizations', 'organization_members', 'audit_logs']");
    expect(exercise).toContain("sourceAuthUsers = Number(sql(source, 'select count(*) from auth.users;'))");
    expect(exercise).toContain("restoredAuthUsers = Number(sql(restore, 'select count(*) from auth.users;'))");
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
    expect(recovery).toContain('EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK');
    expect(recovery).toContain('LAST_KNOWN_GOOD_COMMIT_SHA');
    expect(recovery).toContain('VERCEL_TOKEN');
  });
});
