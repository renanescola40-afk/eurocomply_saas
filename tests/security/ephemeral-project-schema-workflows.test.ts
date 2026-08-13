import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DUPLICATE_REVIEW_REFERENCE,
  KNOWN_DUPLICATE_MIGRATION_GROUPS,
  UNAPPLIED_LEGACY_MIGRATIONS,
  inspectMigrationReplayDebt,
} from '../../scripts/recovery/run-ephemeral-project-schema-replay.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const replay = fs.readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');
const review = fs.readFileSync(DUPLICATE_REVIEW_REFERENCE, 'utf8');
const ephemeralSmoke = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const schemaWorkflows = [
  '.github/workflows/final-technical-controls-proof.yml',
  '.github/workflows/data-governance-runtime-proof.yml',
  '.github/workflows/incident-continuity-runtime-proof.yml',
  '.github/workflows/procurement-trust-runtime-proof.yml',
  '.github/workflows/enterprise-integrations-runtime-proof.yml',
].map((path) => ({ path, source: fs.readFileSync(path, 'utf8') }));
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

const expectedDuplicateVersions = Object.keys(KNOWN_DUPLICATE_MIGRATION_GROUPS).sort();
const expectedDuplicateFiles = Object.values(KNOWN_DUPLICATE_MIGRATION_GROUPS).flat();

describe('exact-SHA disposable project schema workflows', () => {
  it('copies the prepared migration tree and reapplies it through Supabase CLI', () => {
    expect(manager).toContain("join(process.cwd(), 'supabase', 'migrations')");
    expect(manager).toContain("join(workDir, 'supabase', 'migrations')");
    expect(manager).toContain('cpSync(sourceDir, targetDir, { recursive: true, force: true })');
    expect(manager).toContain("'db', 'reset', '--local', '--no-seed'");
    expect(manager).toContain('verifyExactShaMigrations(dbUrl, expectedVersions)');
    expect(manager).toContain('supabase_migrations.schema_migrations');
  });

  it('binds disposable duplicate replay to the exact owner-reviewed 16-group inventory', () => {
    const debt = inspectMigrationReplayDebt('supabase/migrations');
    expect(debt.duplicateVersions.map(({ version }) => version)).toEqual(expectedDuplicateVersions);
    expect(debt.duplicateVersions).toHaveLength(16);
    expect(expectedDuplicateFiles).toHaveLength(39);

    for (const { version, files } of debt.duplicateVersions) {
      expect(files).toEqual([...KNOWN_DUPLICATE_MIGRATION_GROUPS[version as keyof typeof KNOWN_DUPLICATE_MIGRATION_GROUPS]].sort());
      expect(review).toContain(`version \`${version}\``);
      for (const file of files) expect(review).toContain(`\`${file}\``);
    }
  });

  it('excludes only the proven 20260605 legacy files and stages the other reviewed collision effects', () => {
    expect(UNAPPLIED_LEGACY_MIGRATIONS).toHaveLength(5);
    expect(UNAPPLIED_LEGACY_MIGRATIONS).toEqual([
      '20260605_compliance_evidence.sql',
      '20260605_evidence_vault.sql',
      '20260605_findings_tasks.sql',
      '20260605_gap_analysis.sql',
      '20260605_gap_analysis_user_scoped_patch.sql',
    ]);
    expect(replay).toContain("const UNAPPLIED_LEGACY_VERSION = '20260605'");
    expect(replay).toContain('allocateReplayVersions(version, files.length, occupied)');
    expect(replay).toContain('copyFileSync(backupPath, stagedPath)');
    expect(replay).toContain('Replay-only timestamps are not migration-history repair evidence');
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL', 'false')");
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_DUPLICATE_GROUP_COUNT', '16')");
    expect(replay).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_LEGACY_EXCLUDED_FILE_COUNT'");
    expect(replay).toContain('removeAndRestoreReplayFiles(items)');
    expect(replay).not.toContain('migration repair');
  });

  it('never converts schema-effect replay into production migration-history authority', () => {
    expect(replay).toContain('does NOT');
    expect(replay).toContain('resolve REQUIRES_SPLIT_REVIEW');
    expect(replay).toContain('authorize staging');
    expect(replay).toContain('authorize production execution');
    expect(replay).toContain(DUPLICATE_REVIEW_REFERENCE);
    expect(replay).toContain("process.env.GITHUB_ACTIONS !== 'true'");
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
    expect(manager).toContain('ruleExists(binary, args)');
    expect(manager).toContain('if (ruleExists(binary, args)) return false');
  });

  it('deduplicates stale smoke runs and requires the noncanonical replay boundary at runtime', () => {
    expect(ephemeralSmoke).toContain('group: ephemeral-supabase-project-smoke-pr-${{ github.event.pull_request.number }}');
    expect(ephemeralSmoke).toContain('cancel-in-progress: true');
    expect(ephemeralSmoke).toContain('EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}');
    expect(ephemeralSmoke).toContain('ref: ${{ github.event.pull_request.head.sha }}');
    expect(ephemeralSmoke).toContain('run-ephemeral-project-schema-replay.mjs');
    expect(ephemeralSmoke).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
  });

  it('uses the reviewed disposable schema-effect replay and mandatory cleanup for every schema-only proof', () => {
    for (const { path, source } of schemaWorkflows) {
      expect(source, path).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(source, path).toContain('version: 2.101.0');
      expect(source, path).toContain('run-ephemeral-project-schema-replay.mjs');
      expect(source, path).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(source, path).toContain('manage-ephemeral-recovery-database.mjs stop');
      expect(source, path).toMatch(/if: always\(\)/);
      expect(source, path).toContain('persist-credentials: false');
    }
  });

  it('keeps production backup restore on a clean target instead of replaying project migrations first', () => {
    expect(recovery).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
    expect(recovery).toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).not.toContain('run-ephemeral-project-schema-replay.mjs');
    expect(recovery).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    expect(recovery).toContain('run-backup-restore-exercise.mjs');
  });
});
