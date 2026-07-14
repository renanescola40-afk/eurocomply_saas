import { describe, expect, it } from 'vitest';
import { validateRestoreManifest } from '../../scripts/recovery/validate-isolated-restore-evidence.mjs';

function validManifest() {
  return {
    schemaVersion: 1,
    executionId: 'dr-2026-001',
    commitSha: 'a'.repeat(40),
    executedAt: '2026-01-01T03:45:00.000Z',
    sourceEnvironment: 'production',
    targetEnvironment: 'recovery-isolated',
    sourceProjectRef: 'prod-ref',
    targetProjectRef: 'recovery-ref',
    backup: {
      id: 'backup-1', provider: 'supabase', createdAt: '2026-01-01T03:00:00.000Z', completedAt: '2026-01-01T03:05:00.000Z', encrypted: true, checksumSha256: 'b'.repeat(64),
    },
    restore: { startedAt: '2026-01-01T03:10:00.000Z', completedAt: '2026-01-01T03:35:00.000Z', status: 'completed' },
    checks: [
      { name: 'backupExists', passed: true, evidence: 'backup-ref' },
      { name: 'restoreExecuted', passed: true, evidence: 'restore-ref' },
      { name: 'dataIntegrity', passed: true, evidence: 'integrity-ref' },
      { name: 'rlsAfterRestore', passed: true, evidence: 'rls-ref' },
    ],
    metrics: { measured: true, rpoSeconds: 300, rtoSeconds: 1500 },
    approval: { approvedBy: 'reviewer', approvedAt: '2026-01-01T03:50:00.000Z', outcome: 'passed' },
  };
}

describe('isolated restore evidence', () => {
  it('generates Complete evidence only from a valid isolated restore', () => {
    const evidence = validateRestoreManifest(validManifest());
    expect(evidence.status).toBe('Complete');
    expect(evidence.generatedFromRealEvidence).toBe(true);
    expect(evidence.environment).toBe('recovery-isolated');
    expect(evidence.checks).toHaveLength(4);
  });

  it('rejects production as the restore target', () => {
    expect(() => validateRestoreManifest({ ...validManifest(), targetEnvironment: 'production' })).toThrow(/recovery-isolated/);
  });

  it('rejects restoring into the source project', () => {
    const manifest = validManifest();
    manifest.targetProjectRef = manifest.sourceProjectRef;
    expect(() => validateRestoreManifest(manifest)).toThrow(/must differ/);
  });

  it('rejects missing post-restore RLS proof', () => {
    const manifest = validManifest();
    manifest.checks = manifest.checks.filter((check) => check.name !== 'rlsAfterRestore');
    expect(() => validateRestoreManifest(manifest)).toThrow(/rlsAfterRestore/);
  });

  it('rejects unmeasured recovery objectives', () => {
    const manifest = validManifest();
    manifest.metrics.measured = false;
    expect(() => validateRestoreManifest(manifest)).toThrow(/measured/);
  });

  it('rejects approval before restore completion', () => {
    const manifest = validManifest();
    manifest.approval.approvedAt = '2026-01-01T03:20:00.000Z';
    expect(() => validateRestoreManifest(manifest)).toThrow(/predates/);
  });
});
