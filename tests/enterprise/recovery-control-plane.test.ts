import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const manager = readFileSync('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const backupRestore = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const extensionParity = readFileSync('scripts/recovery/recovery-extension-parity.mjs', 'utf8');
const evidenceValidator = readFileSync('scripts/recovery/check-recovery-evidence.mjs', 'utf8');

describe('enterprise recovery control plane', () => {
  it('runs only for exact protected main with read-only repository permissions', () => {
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/recovery:[\s\S]*?environment:\s*\n\s+name: supabase-production-migration-dry-run/);
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$GITHUB_REF_NAME" = \'main\'');
    expect(workflow).toContain('git ls-remote origin refs/heads/main');
  });

  it('verifies live environment governance before the job can load the protected source secret', () => {
    const governanceJob = workflow.indexOf('  environment-governance:');
    const recoveryJob = workflow.indexOf('  recovery:');
    expect(governanceJob).toBeGreaterThan(-1);
    expect(recoveryJob).toBeGreaterThan(governanceJob);

    const preflight = workflow.slice(governanceJob, recoveryJob);
    expect(preflight).toContain('Verify recovery environment governance before protected secrets');
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: supabase-production-migration-dry-run');
    expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(preflight).not.toMatch(/secrets\./);

    const protectedBoundary = workflow.slice(recoveryJob);
    expect(protectedBoundary).toContain('needs: environment-governance');
    expect(protectedBoundary).toContain('name: supabase-production-migration-dry-run');
    expect(protectedBoundary).toContain('RECOVERY_SOURCE_DATABASE_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}');
  });

  it('reuses the protected Supabase source and provisions a disposable isolated target', () => {
    expect(workflow).toContain('RECOVERY_SOURCE_DATABASE_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}');
    expect(workflow).toContain('RECOVERY_REQUIRED_EXERCISE: backup-restore');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs start');
    expect(workflow).toContain('manage-ephemeral-recovery-database.mjs stop');
    expect(workflow).not.toContain('secrets.RECOVERY_ISOLATED_DATABASE_URL');
    expect(workflow).not.toContain('secrets.RECOVERY_SOURCE_DATABASE_URL');
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
