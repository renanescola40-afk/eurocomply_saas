import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const builder = readFileSync('scripts/enterprise/build-recovery-evidence.mjs', 'utf8');

const requiredControls = [
  'rollbackTargetConfigured',
  'distinctDeployment',
  'rollbackExecuted',
  'postRollbackHealth',
  'backupExists',
  'restoreExecuted',
  'dataIntegrity',
  'rlsAfterRestore',
  'rpoMeasured',
  'rtoMeasured',
];

describe('enterprise recovery control plane', () => {
  it('runs only from protected main or manual dispatch with read-only repository permissions', () => {
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
  });

  it('requires isolated backup and restore infrastructure and exact-SHA provenance', () => {
    expect(workflow).toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(workflow).toContain('RECOVERY_ISOLATED_DATABASE_URL');
    expect(workflow).toContain('git ls-remote origin refs/heads/main');
    expect(workflow).toContain('pg_dump');
    expect(workflow).toContain('pg_restore');
    expect(workflow).toContain('pg_policies');
  });

  it('covers all ten recovery controls and fails closed on integrity mismatch', () => {
    for (const control of requiredControls) expect(builder).toContain(control);
    expect(builder).toContain('sourceRows === restoredRows');
    expect(builder).toContain('sourcePolicies === restoredPolicies');
    expect(builder).toContain('process.exitCode = 1');
  });

  it('stores only derived metrics and redacted provenance', () => {
    expect(builder).not.toContain('SOURCE_DATABASE_URL');
    expect(builder).not.toContain('RESTORE_DATABASE_URL');
    expect(builder).toContain('No deployment URL, token, provider payload or customer data is stored.');
  });
});
