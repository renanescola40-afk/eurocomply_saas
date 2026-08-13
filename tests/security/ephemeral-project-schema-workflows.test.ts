import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const manager = fs.readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const replay = fs.readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');
const ephemeralSmoke = fs.readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const migrationNames = fs
  .readdirSync('supabase/migrations', { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^(\d+).*\.sql$/.test(entry.name))
  .map((entry) => entry.name);
const schemaWorkflows = [
  '.github/workflows/final-technical-controls-proof.yml',
  '.github/workflows/data-governance-runtime-proof.yml',
  '.github/workflows/incident-continuity-runtime-proof.yml',
  '.github/workflows/procurement-trust-runtime-proof.yml',
  '.github/workflows/enterprise-integrations-runtime-proof.yml',
].map((path) => ({ path, source: fs.readFileSync(path, 'utf8') }));
const recovery = fs.readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const knownLegacyCollisions = [
  '20260605_gap_analysis.sql',
  '20260605_findings_tasks.sql',
  '20260605_compliance_evidence.sql',
  '20260605_evidence_vault.sql',
  '20260605_gap_analysis_user_scoped_patch.sql',
].sort();

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

  it('contains exactly the known legacy duplicate migration version group', () => {
    const byVersion = new Map<string, string[]>();
    for (const name of migrationNames) {
      const version = name.match(/^(\d+).*\.sql$/)?.[1];
      if (!version) continue;
      byVersion.set(version, [...(byVersion.get(version) ?? []), name]);
    }

    const duplicates = [...byVersion.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([version, names]) => [version, [...names].sort()] as const);

    expect(duplicates).toEqual([['20260605', knownLegacyCollisions]]);
  });

  it('stages only known duplicate-prefix legacy migrations and restores their exact bytes after replay', () => {
    for (const migration of knownLegacyCollisions) {
      expect(replay).toContain(migration);
    }
    expect(replay).toContain("LEGACY_COLLISION_VERSION = '20260605'");
    expect(replay).toContain('assertKnownLegacyCollisionOnly(migrationsDir)');
    expect(replay).toContain('assertNoMigrationVersionCollisions(migrationsDir)');
    expect(replay).toContain('Expected exactly one known legacy migration version collision');
    expect(replay).toContain('Unknown migration version collision detected');
    expect(replay).toContain("createHash('sha256')");
    expect(replay).toContain('renameSync(canonicalPath, replayPath)');
    expect(replay).toContain('sha256(replayPath) !== digest');
    expect(replay).toContain('restoreLegacyReplay(staged)');
    expect(replay).toContain('if (staged.length > 0)');
    expect(replay).toContain('and rollback failed');
    expect(replay).toContain("['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project']");
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
  });

  it('uses deterministic project replay and mandatory cleanup for every schema-only protected proof', () => {
    for (const { path, source } of schemaWorkflows) {
      expect(source, path).toContain('supabase/setup-cli@46f89843689f213b433d85a0508d1183e1803070');
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
