import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DUPLICATE_REVIEW_REFERENCE,
  INVALID_REVIEW_REFERENCE,
  KNOWN_DUPLICATE_MIGRATION_GROUPS,
  UNAPPLIED_LEGACY_MIGRATIONS,
  UNRESOLVED_INVALID_MIGRATIONS,
  inspectMigrationReplayDebt,
} from '../../scripts/recovery/run-ephemeral-project-schema-replay.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const replay = fs.readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');
const duplicateReview = fs.readFileSync(DUPLICATE_REVIEW_REFERENCE, 'utf8');
const invalidReview = fs.readFileSync(INVALID_REVIEW_REFERENCE, 'utf8');
const ephemeralSmoke = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const schemaWorkflows = [
  '.github/workflows/final-technical-controls-proof.yml',
  '.github/workflows/data-governance-runtime-proof.yml',
  '.github/workflows/incident-continuity-runtime-proof.yml',
  '.github/workflows/procurement-trust-runtime-proof.yml',
  '.github/workflows/enterprise-integrations-runtime-proof.yml',
].map((path) => ({ path, source: fs.readFileSync(path, 'utf8') }));
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

const duplicateVersions = Object.keys(KNOWN_DUPLICATE_MIGRATION_GROUPS).sort();
const duplicateFiles = Object.values(KNOWN_DUPLICATE_MIGRATION_GROUPS).flat();

describe('exact-SHA disposable project schema workflows', () => {
  it('replays a prepared temporary migration tree through pinned Supabase CLI', () => {
    expect(manager).toContain("join(process.cwd(), 'supabase', 'migrations')");
    expect(manager).toContain('cpSync(sourceDir, targetDir, { recursive: true, force: true })');
    expect(manager).toContain("'db', 'reset', '--local', '--no-seed'");
    expect(manager).toContain('verifyExactShaMigrations(dbUrl, expectedVersions)');
  });

  it('binds duplicate replay to the exact 16 owner-reviewed collision groups', () => {
    const debt = inspectMigrationReplayDebt('supabase/migrations');
    expect(debt.duplicateVersions.map(({ version }) => version)).toEqual(duplicateVersions);
    expect(debt.duplicateVersions).toHaveLength(16);
    expect(duplicateFiles).toHaveLength(39);
    for (const { version, files } of debt.duplicateVersions) {
      expect(files).toEqual([
        ...KNOWN_DUPLICATE_MIGRATION_GROUPS[version as keyof typeof KNOWN_DUPLICATE_MIGRATION_GROUPS],
      ].sort());
      expect(duplicateReview).toContain(`version \`${version}\``);
      for (const file of files) expect(duplicateReview).toContain(`\`${file}\``);
    }
  });

  it('excludes five proven legacy files and one unresolved invalid RLS artifact', () => {
    expect(UNAPPLIED_LEGACY_MIGRATIONS).toHaveLength(5);
    expect(UNRESOLVED_INVALID_MIGRATIONS).toEqual(['20260619_multi_tenant_rls_hardening.sql']);
    expect(invalidReview).toContain('`20260619_multi_tenant_rls_hardening.sql`');
    expect(invalidReview).toContain('REQUIRES_SPLIT_REVIEW');
    expect(replay).toContain("const UNAPPLIED_LEGACY_VERSION = '20260605'");
    expect(replay).toContain('for (const canonicalName of UNRESOLVED_INVALID_MIGRATIONS)');
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_UNRESOLVED_INVALID_EXCLUDED_FILE_COUNT'");
  });

  it('stages the other 34 duplicate files only for disposable schema effects', () => {
    expect(duplicateFiles.length - UNAPPLIED_LEGACY_MIGRATIONS.length).toBe(34);
    expect(replay).toContain('allocateReplayVersions(version, files.length, occupied)');
    expect(replay).toContain('copyFileSync(item.backupPath, item.replayPath)');
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_REPLAY_STAGED_FILE_COUNT'");
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL', 'false')");
    expect(replay).toContain('replay timestamps are not migration-history repair evidence');
    expect(replay).toContain('restoreItems(items)');
  });

  it('never promotes disposable replay into migration-history authority', () => {
    expect(replay).toContain(DUPLICATE_REVIEW_REFERENCE);
    expect(replay).toContain(INVALID_REVIEW_REFERENCE);
    expect(replay).toContain("process.env.GITHUB_ACTIONS !== 'true'");
    expect(ephemeralSmoke).toContain('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL');
  });

  it('revalidates and hardens Docker bindings after project schema reset', () => {
    const resetIndex = manager.indexOf("'db', 'reset', '--local', '--no-seed'");
    const postResetContainerIndex = manager.indexOf('findDatabaseContainer(projectId)', resetIndex);
    const postResetFirewallIndex = manager.indexOf('hardenWildcardBindings(containerName, projectId)', resetIndex);
    const migrationVerifyIndex = manager.indexOf('verifyExactShaMigrations(dbUrl, expectedVersions)', resetIndex);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(postResetContainerIndex).toBeGreaterThan(resetIndex);
    expect(postResetFirewallIndex).toBeGreaterThan(postResetContainerIndex);
    expect(migrationVerifyIndex).toBeGreaterThan(postResetFirewallIndex);
    expect(manager).toContain('if (ruleExists(binary, args)) return false');
  });

  it('uses the reviewed disposable schema-effect replay and cleanup in schema-only proofs', () => {
    for (const { path, source } of schemaWorkflows) {
      expect(source, path).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(source, path).toContain('run-ephemeral-project-schema-replay.mjs');
      expect(source, path).toContain('manage-ephemeral-recovery-database.mjs stop');
      expect(source, path).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(source, path).toContain('persist-credentials: false');
    }
  });

  it('keeps production backup restore on a clean target without project replay', () => {
    expect(recovery).toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).not.toContain('run-ephemeral-project-schema-replay.mjs');
    expect(recovery).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
  });
});
