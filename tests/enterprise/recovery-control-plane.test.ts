import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildPinnedPsqlInvocation,
  expectedRecoveryContainerName,
} from '../../scripts/recovery/run-pinned-recovery-psql.mjs';

const workflow = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const resilienceWorkflow = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const manager = readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const backupRestore = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const extensionParity = readFileSync('scripts/recovery/recovery-extension-parity.mjs', 'utf8');
const evidenceValidator = readFileSync('scripts/recovery/check-recovery-evidence.mjs', 'utf8');
const pinnedPsql = readFileSync('scripts/recovery/run-pinned-recovery-psql.mjs', 'utf8');

describe('enterprise recovery control plane', () => {
  it('runs only for exact protected main with read-only repository permissions', () => {
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/recovery:[\s\S]*?environment:\s*\n\s+name: production-recovery/);
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$GITHUB_REF_NAME" = \'main\'');
    expect(workflow).toContain('git ls-remote origin refs/heads/main');
  });

  it('uses the dedicated recovery authority and does not admit database secrets before post-approval validation', () => {
    const governanceJob = workflow.indexOf('  environment-governance:');
    const recoveryJob = workflow.indexOf('  recovery:');
    expect(governanceJob).toBeGreaterThan(-1);
    expect(recoveryJob).toBeGreaterThan(governanceJob);

    const preflight = workflow.slice(governanceJob, recoveryJob);
    expect(preflight).toContain('Verify recovery environment governance before protected secrets');
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: production-recovery');
    expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(preflight).not.toMatch(/secrets\./);

    const stepsIndex = workflow.indexOf('    steps:', recoveryJob);
    const protectedJobHeader = workflow.slice(recoveryJob, stepsIndex);
    expect(protectedJobHeader).toContain('name: production-recovery');
    expect(protectedJobHeader).not.toMatch(/secrets\./);
    expect(protectedJobHeader).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(workflow).not.toContain('SUPABASE_DB_POOLER_URL');
  });

  it('revalidates exact main and environment governance immediately before the first recovery secret consumer', () => {
    const producerBoundary = workflow.indexOf('- name: Revalidate protected recovery producer boundary');
    const firstSecret = workflow.indexOf('${{ secrets.');
    const preflight = workflow.indexOf('- name: Preflight protected backup restore proof');
    const execute = workflow.indexOf('- name: Execute supported logical backup and isolated restore');

    expect(producerBoundary).toBeGreaterThan(-1);
    expect(firstSecret).toBeGreaterThan(producerBoundary);
    expect(preflight).toBeGreaterThan(producerBoundary);
    expect(execute).toBeGreaterThan(preflight);

    const boundaryBlock = workflow.slice(producerBoundary, preflight);
    expect(boundaryBlock).toContain('git fetch --no-tags --depth=1 origin main');
    expect(boundaryBlock).toContain('test "$(git rev-parse origin/main)" = "$TARGET_SHA"');
    expect(boundaryBlock).toContain('https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/main');
    expect(boundaryBlock).toContain('GITHUB_ENVIRONMENT_NAME: production-recovery');
    expect(boundaryBlock).toContain('check-github-environment-governance.mjs');
    expect(boundaryBlock).not.toMatch(/secrets\./);

    expect(workflow.slice(preflight, execute)).toContain(
      'RECOVERY_SOURCE_DATABASE_URL: ${{ secrets.RECOVERY_SOURCE_DATABASE_URL }}',
    );
    expect(workflow.slice(execute)).toContain(
      'RECOVERY_SOURCE_DATABASE_URL: ${{ secrets.RECOVERY_SOURCE_DATABASE_URL }}',
    );
  });

  it('eliminates network apt client installation from both protected recovery paths', () => {
    for (const recoveryWorkflow of [workflow, resilienceWorkflow]) {
      expect(recoveryWorkflow).not.toContain('apt-get update');
      expect(recoveryWorkflow).not.toContain('apt-get install');
      expect(recoveryWorkflow).not.toContain('postgresql-client');
      expect(recoveryWorkflow).toContain('Install pinned recovery psql shim');
      expect(recoveryWorkflow).toContain('run-pinned-recovery-psql.mjs');
      expect(recoveryWorkflow).toContain('echo "$shim_dir" >> "$GITHUB_PATH"');
    }
  });

  it('routes controlled psql calls through the exact per-run Supabase Postgres container', () => {
    const runId = '12345';
    const runAttempt = '2';
    const expectedContainer = expectedRecoveryContainerName(runId, runAttempt);
    expect(expectedContainer).toBe('supabase_db_risck-recovery-12345-2');

    const remote = buildPinnedPsqlInvocation({
      args: [
        'postgresql://user:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require',
        '--no-psqlrc',
        '--command',
        'select 1;',
      ],
      runId,
      runAttempt,
      configuredContainer: expectedContainer,
    });
    expect(remote.command).toBe('docker');
    expect(remote.localTarget).toBe(false);
    expect(remote.args.slice(0, 3)).toEqual(['exec', expectedContainer, 'psql']);
    expect(remote.args[3]).toContain('pooler.supabase.com');
    expect(remote.args).toContain('--no-psqlrc');

    const local = buildPinnedPsqlInvocation({
      args: ['postgresql://postgres:postgres@127.0.0.1:31873/postgres', '-At', '-c', 'select 1;'],
      runId,
      runAttempt,
      configuredContainer: expectedContainer,
    });
    expect(local.localTarget).toBe(true);
    expect(local.args).toEqual([
      'exec', expectedContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c', 'select 1;',
    ]);
    expect(() => buildPinnedPsqlInvocation({
      args: ['postgresql://postgres:postgres@127.0.0.1:31873/postgres'],
      runId,
      runAttempt,
      configuredContainer: 'supabase_db_wrong-project',
    })).toThrow('recovery_psql_container_identity_mismatch');
  });

  it('keeps the pinned psql proxy shell-free, time-bounded and secret-minimizing', () => {
    expect(pinnedPsql).toContain("command: 'docker'");
    expect(pinnedPsql).toContain("'exec'");
    expect(pinnedPsql).toContain("'psql'");
    expect(pinnedPsql).toContain('shell: false');
    expect(pinnedPsql).toContain('timeout: 15 * 60_000');
    expect(pinnedPsql).toContain("console.error('recovery_pinned_psql_failed')");
    expect(pinnedPsql).not.toContain('console.log(databaseUrl');
    expect(pinnedPsql).not.toContain('console.error(error');
  });

  it('reuses the protected recovery source and provisions a disposable isolated target', () => {
    expect(workflow).toContain('RECOVERY_SOURCE_DATABASE_URL: ${{ secrets.RECOVERY_SOURCE_DATABASE_URL }}');
    expect(workflow).toContain('RECOVERY_REQUIRED_EXERCISE: backup-restore');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs start');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs stop');
    expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
  });

  it('uses the supported logical backup path and canonical evidence validator', () => {
    expect(workflow).toContain('preflight-protected-proof.mjs recovery');
    expect(workflow).toContain('run-backup-restore-exercise.mjs');
    expect(workflow).toContain('check-recovery-evidence.mjs');
    expect(workflow).toContain('docs/security/evidence/p1/backup-restore-tested.json');

    expect(backupRestore).toContain("'db', 'dump'");
    expect(backupRestore).toContain("'--role-only'");
    expect(backupRestore).toContain("'--data-only', '--use-copy'");
    expect(backupRestore).toContain('checks.dataIntegrity');
    expect(backupRestore).toContain('checks.rlsAfterRestore');
    expect(evidenceValidator).toContain("restore.schema === 'risck-comply.backup-restore-evidence.v2'");
    expect(evidenceValidator).toContain("mode === 'full' || mode === 'production-rollback'");
  });

  it('pins the disposable target to the production Supabase software image before strict extension parity', () => {
    expect(manager).toContain("RECOVERY_SUPABASE_POSTGRES_IMAGE_VERSION = '17.6.1.127'");
    expect(manager).toContain("join(String(workDir), 'supabase', '.temp', 'postgres-version')");
    expect(manager.indexOf('writeRecoveryPostgresImagePin(workDir)'))
      .toBeLessThan(manager.indexOf("run('supabase', ['--workdir', workDir, 'db', 'start'])"));
    expect(manager).toContain("run('docker', ['inspect', '--format', '{{.Config.Image}}', containerName]");
    expect(manager).toContain('observedPostgresImageVersion !== expectedPostgresImageVersion');
  });

  it('reconciles exact source extension name schema and version only on the disposable target', () => {
    const parityIndex = backupRestore.indexOf("failurePhase = 'extension_parity'");
    const restoreIndex = backupRestore.indexOf("failurePhase = 'isolated_restore'");
    expect(parityIndex).toBeGreaterThan(-1);
    expect(restoreIndex).toBeGreaterThan(parityIndex);
    expect(backupRestore).toContain("'version', e.extversion");
    expect(backupRestore).toContain("'version', v.version");
    expect(backupRestore).toContain('planExtensionParity(sourceExtensions, targetExtensions, availableExtensions)');
    expect(backupRestore).toContain('checks.extensionParity = extensionParitySatisfied');
    expect(backupRestore).toContain("throw new Error('recovery_target_extension_version_unavailable')");
    expect(backupRestore).toContain("throw new Error('recovery_target_extension_version_mismatch')");
    expect(backupRestore).toContain("throw new Error('recovery_target_extension_schema_mismatch')");
    expect(backupRestore).toContain('extensionNamesStored: false');
    expect(backupRestore).toContain('extensionVersionsStored: false');
    expect(extensionParity).toContain('create extension if not exists');
    expect(extensionParity).toContain('quotePgIdentifier');
    expect(extensionParity).toContain('quotePgLiteral');
  });

  it('never manufactures rollback credit from the automatic backup restore drill', () => {
    expect(workflow).not.toContain('ROLLBACK_EXECUTED=true');
    expect(workflow).not.toContain('POST_ROLLBACK_HEALTH=true');
    expect(workflow).not.toContain('rollback-source.json');
    expect(workflow).not.toContain('build-recovery-evidence.mjs');
    expect(workflow).not.toContain('LAST_KNOWN_GOOD_DEPLOYMENT_URL');
    expect(workflow).not.toContain('RELEASE_ROLLBACK_TARGET');
    expect(workflow).not.toContain('run-live-rollback-exercise.mjs');
  });

  it('keeps rollback evidence optional in backup-restore mode and mandatory in rollback modes', () => {
    expect(evidenceValidator).toContain("const requireRollback = mode === 'full' || mode === 'production-rollback'");
    expect(evidenceValidator).toContain("const requireRestore = mode === 'full' || mode === 'backup-restore'");
    expect(evidenceValidator).toContain("rollback.schema === 'risck-comply.rollback-validation.v4'");
  });
});
