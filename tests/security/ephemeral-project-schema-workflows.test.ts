import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { inspectMigrationReplayDebt } from '../../scripts/recovery/run-ephemeral-project-schema-replay.mjs';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const replay = fs.readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');
const ephemeralSmoke = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const schemaWorkflows = [
  '.github/workflows/final-technical-controls-proof.yml',
  '.github/workflows/data-governance-runtime-proof.yml',
  '.github/workflows/incident-continuity-runtime-proof.yml',
  '.github/workflows/procurement-trust-runtime-proof.yml',
  '.github/workflows/enterprise-integrations-runtime-proof.yml',
].map((path) => ({ path, source: fs.readFileSync(path, 'utf8') }));
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');

const expectedDuplicateVersions = [
  '20260605',
  '20260610',
  '20260612',
  '20260613',
  '20260620120000',
  '20260623120000',
  '20260626120000',
  '20260629113000',
  '20260706103000',
  '20260719224500',
  '20260720190000',
  '20260721200000',
  '20260723223000',
  '20260724001000',
  '20260724103000',
  '20260728170000',
];

describe('exact-SHA disposable project schema workflows', () => {
  it('copies only committed project migrations and reapplies them through Supabase CLI', () => {
    expect(manager).toContain("join(process.cwd(), 'supabase', 'migrations')");
    expect(manager).toContain("join(workDir, 'supabase', 'migrations')");
    expect(manager).toContain('cpSync(sourceDir, targetDir, { recursive: true, force: true })');
    expect(manager).toContain("'db', 'reset', '--local', '--no-seed'");
    expect(manager).toContain('verifyExactShaMigrations(dbUrl, expectedVersions)');
    expect(manager).toContain('supabase_migrations.schema_migrations');
    expect(manager).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_DATABASE_MODE', mode)");
    expect(manager).toContain("appendGithubEnv('RECOVERY_EPHEMERAL_MIGRATION_COUNT', String(migrationCount))");
  });

  it('reports the complete known duplicate migration-version debt instead of hiding all but one legacy group', () => {
    const debt = inspectMigrationReplayDebt('supabase/migrations');
    expect(debt.duplicateVersions.map(({ version }) => version)).toEqual(expectedDuplicateVersions);
    expect(debt.invalidFiles.length).toBeGreaterThan(0);
    expect(debt.duplicateVersions.find(({ version }) => version === '20260605')?.files).toEqual([
      '20260605_compliance_evidence.sql',
      '20260605_evidence_vault.sql',
      '20260605_findings_tasks.sql',
      '20260605_gap_analysis.sql',
      '20260605_gap_analysis_user_scoped_patch.sql',
    ]);
    expect(debt.duplicateVersions.find(({ version }) => version === '20260724103000')?.files).toEqual([
      '20260724103000_enterprise_group_access_reconciliation_queue.sql',
      '20260724103000_enterprise_seat_concurrency.sql',
      '20260724103000_qualified_review_api_operations.sql',
    ]);
  });

  it('fails project replay closed until migration reconciliation is explicitly reviewed', () => {
    expect(replay).toContain('MIGRATION_RECONCILIATION_REQUIRED');
    expect(replay).toContain('invalid_local_files=${debt.invalidFiles.length}');
    expect(replay).toContain('duplicate_versions=${debt.duplicateVersions.length}');
    expect(replay).toContain('assertProjectSchemaReplayDeployable(migrationsDir)');
    expect(replay).toContain("['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project']");
    expect(replay.indexOf('assertProjectSchemaReplayDeployable(migrationsDir)'))
      .toBeLessThan(replay.indexOf("['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project']"));
    expect(replay).not.toContain('renameSync(');
    expect(replay).not.toContain('quarantineUnappliedLegacyMigrations');
    expect(replay).not.toContain('UNAPPLIED_LEGACY_MIGRATIONS');
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

  it('deduplicates stale disposable smoke runs by PR while keeping exact-SHA checkout inside the surviving run', () => {
    expect(ephemeralSmoke).toContain(
      'group: ephemeral-supabase-project-smoke-pr-${{ github.event.pull_request.number }}',
    );
    expect(ephemeralSmoke).toContain('cancel-in-progress: true');
    expect(ephemeralSmoke).not.toContain(
      'group: ephemeral-supabase-project-smoke-${{ github.event.pull_request.number }}-${{ github.event.pull_request.head.sha }}',
    );
    expect(ephemeralSmoke).toContain('EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}');
    expect(ephemeralSmoke).toContain('ref: ${{ github.event.pull_request.head.sha }}');
    expect(ephemeralSmoke).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD_SHA"');
    expect(ephemeralSmoke).toContain('run-ephemeral-project-schema-replay.mjs');
    expect(ephemeralSmoke).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
  });

  it('uses the fail-closed project replay and mandatory cleanup for every schema-only protected proof', () => {
    for (const { path, source } of schemaWorkflows) {
      expect(source, path).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(source, path).toContain('version: 2.101.0');
      expect(source, path).toContain('run-ephemeral-project-schema-replay.mjs');
      expect(source, path).not.toContain('manage-ephemeral-recovery-database.mjs start-project');
      expect(source, path).toContain('manage-ephemeral-recovery-database.mjs stop');
      expect(source, path).toMatch(/if: always\(\)/);
      expect(source, path).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
      expect(source, path).toContain('persist-credentials: false');
    }
  });

  it('keeps production backup restore on a clean restore-target instead of preapplying project migrations', () => {
    expect(recovery).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
    expect(recovery).toContain('manage-ephemeral-recovery-database.mjs start');
    expect(recovery).not.toContain('manage-ephemeral-recovery-database.mjs start-project');
    expect(recovery).not.toContain('run-ephemeral-project-schema-replay.mjs');
    expect(recovery).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    expect(recovery).toContain('run-backup-restore-exercise.mjs');
    expect(recovery).toMatch(/Remove disposable recovery database[\s\S]*?if: always\(\) &&/);
  });

  it('removes selective manual migration replay from enterprise integrations', () => {
    const integrations = schemaWorkflows.find(({ path }) => path.endsWith('enterprise-integrations-runtime-proof.yml'))?.source ?? '';
    expect(integrations).not.toContain('apply_migrations:');
    expect(integrations).not.toContain('20260721113000_enterprise_integrations_platform.sql');
    expect(integrations).not.toContain('20260721114500_enterprise_integrations_tenant_relations.sql');
    expect(integrations).toContain("printf 'DATABASE_URL=%s\\n' \"$RECOVERY_ISOLATED_DATABASE_URL\" >> \"$GITHUB_ENV\"");
  });
});
