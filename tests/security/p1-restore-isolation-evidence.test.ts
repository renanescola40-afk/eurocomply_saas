import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirectories: string[] = [];

function evidence() {
  return {
    schemaVersion: 1,
    controlId: 'P1-07',
    control: 'backup-restore-tested',
    status: 'Complete',
    evidenceKind: 'final-p1-control-evidence',
    generatedFromRealEvidence: true,
    productionValidated: true,
    generatedAt: '2026-07-14T18:00:00.000Z',
    reviewedAt: '2026-07-14T19:00:00.000Z',
    reviewer: 'recovery reviewer',
    nextReviewDue: '2026-10-14',
    environment: 'production',
    targetEnvironment: 'recovery-isolated',
    validation: {
      result: 'pass',
      validatedAt: '2026-07-14T18:50:00.000Z',
      validator: 'restore review',
      method: 'isolated-restore-test-review',
    },
    restoreTests: [
      {
        testId: 'dr-001',
        system: 'supabase-postgres',
        sourceProjectRef: 'production-project',
        targetProjectRef: 'recovery-project',
        backupId: 'backup-001',
        backupEncrypted: true,
        backupChecksumSha256: 'a'.repeat(64),
        startedAt: '2026-07-14T18:05:00.000Z',
        completedAt: '2026-07-14T18:35:00.000Z',
        rtoTargetSeconds: 3600,
        rtoActualSeconds: 1800,
        rpoTargetSeconds: 900,
        rpoActualSeconds: 300,
        status: 'passed',
        evidenceLocation: 'restore-job-reference',
        dataIntegrityEvidence: 'integrity-report-reference',
        rlsEvidence: 'rls-run-reference',
      },
    ],
    controlsVerified: [
      'Critical systems are covered',
      'Restore test completed successfully',
      'Restored data integrity was validated',
      'RLS was validated after restore',
      'RTO target was evaluated',
      'RPO target was evaluated',
    ],
    artifacts: [
      {
        type: 'restore-report',
        reference: 'reviewed-restore-report',
        description: 'Reviewed isolated restore evidence',
        collectedAt: '2026-07-14T18:40:00.000Z',
      },
    ],
  };
}

function run(value: ReturnType<typeof evidence>) {
  const directory = mkdtempSync(join(tmpdir(), 'restore-evidence-'));
  tempDirectories.push(directory);
  const file = join(directory, 'evidence.json');
  writeFileSync(file, JSON.stringify(value));
  return spawnSync('node', ['scripts/security/check-p1-restore-test-evidence.mjs', file], { encoding: 'utf8' });
}

afterEach(() => {
  while (tempDirectories.length) rmSync(tempDirectories.pop()!, { recursive: true, force: true });
});

describe('P1 restore isolation evidence', () => {
  it('accepts a complete isolated restore record', () => {
    expect(run(evidence()).status).toBe(0);
  });

  it('rejects the production project as restore target', () => {
    const value = evidence();
    value.restoreTests[0].targetProjectRef = value.restoreTests[0].sourceProjectRef;
    expect(run(value).stderr).toContain('must differ');
  });

  it('rejects missing post-restore RLS evidence', () => {
    const value = evidence();
    value.restoreTests[0].rlsEvidence = '';
    expect(run(value).stderr).toContain('rlsEvidence is required');
  });

  it('rejects unmeasured RTO values', () => {
    const value = evidence();
    value.restoreTests[0].rtoActualSeconds = Number.NaN;
    expect(run(value).stderr).toContain('rtoActualSeconds must be a measured number');
  });
});
