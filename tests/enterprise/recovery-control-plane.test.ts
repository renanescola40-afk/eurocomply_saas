import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const backupRestore = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const evidenceValidator = readFileSync('scripts/recovery/check-recovery-evidence.mjs', 'utf8');

describe('enterprise recovery control plane', () => {
  it('runs only for exact protected main with read-only repository permissions', () => {
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/jobs:\s*\n\s+recovery:[\s\S]*?environment:\s*\n\s+name: supabase-production-migration-dry-run/);
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$GITHUB_REF_NAME" = \'main\'');
    expect(workflow).toContain('git ls-remote origin refs/heads/main');
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
  });

  it('never manufactures rollback credit from the automatic backup restore drill', () => {
    expect(workflow).not.toContain('ROLLBACK_EXECUTED=true');
    expect(workflow).not.toContain('POST_ROLLBACK_HEALTH=true');
    expect(workflow).not.toContain('rollback-source.json');
    expect(workflow).not.toContain('build-recovery-evidence.mjs');
    expect(workflow).not.toContain('LAST_KNOWN_GOOD_DEPLOYMENT_URL');
    expect(workflow).not.toContain('RELEASE_ROLLBACK_TARGET');
  });
});
