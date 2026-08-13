import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECOVERY_DB_URL,
  RECOVERY_POSTGRES_VERSION,
  buildProjectId,
  isLoopbackDatabaseUrl,
  parseLocalDbUrl,
} from '../../scripts/recovery/manage-ephemeral-recovery-database.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const finalTechnical = fs.readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

describe('ephemeral Supabase recovery database contract', () => {
  it('pins the disposable database to the production-compatible Supabase Postgres 17.6 line', () => {
    expect(RECOVERY_POSTGRES_VERSION).toBe('17.6.1.136');
    expect(DEFAULT_RECOVERY_DB_URL).toBe('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
    expect(manager).toContain("writeFileSync(join(tempDir, 'postgres-version')");
    expect(manager).toContain("serverVersion.startsWith('17.6')");
  });

  it('accepts only loopback database endpoints for the disposable target', () => {
    expect(isLoopbackDatabaseUrl(DEFAULT_RECOVERY_DB_URL)).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@localhost:54322/postgres')).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBe(true);
    expect(isLoopbackDatabaseUrl('postgres://postgres:postgres@db.example.com:54322/postgres')).toBe(false);
    expect(isLoopbackDatabaseUrl('not-a-url')).toBe(false);
    expect(manager).toContain("startsWith('supabase_db_')");
    expect(manager).toMatch(/127\\\.0\\\.0\\\.1\|\\\[::1\\\]/);
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

  it('starts only the database service and always destroys local volumes after proof', () => {
    expect(manager).toContain("'db', 'start'");
    expect(manager).not.toContain("'start', '--exclude'");
    expect(manager).toContain("'stop', '--no-backup'");
    expect(finalTechnical).toMatch(/Remove disposable recovery database[\s\S]*?if: always\(\)/);
    expect(recovery).toMatch(/Remove disposable recovery database[\s\S]*?if: always\(\) &&/);
  });

  it('removes the persistent isolated database secret from protected workflows', () => {
    for (const workflow of [finalTechnical, recovery]) {
      expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(workflow).toContain('Start disposable Supabase recovery database');
      expect(workflow).toContain('supabase/setup-cli@46f89843689f213b433d85a0508d1183e1803070');
      expect(workflow).toContain('version: 2.101.0');
    }
  });

  it('uses the pinned Supabase dump toolchain and Postgres 17 container for restore', () => {
    expect(exercise).toContain("run('supabase', ['db', 'dump', '--db-url', source");
    expect(exercise).toContain("'--schema', 'public,app_private'");
    expect(exercise).toContain("'--data-only', '--use-copy'");
    expect(exercise).toContain("run('docker', ['cp', path, `${container}:${containerPath}`])");
    expect(exercise).toContain("'exec', container, 'psql', '-U', 'postgres'");
    expect(exercise).toContain("criticalTables = ['organizations', 'organization_members', 'audit_logs']");
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
