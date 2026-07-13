import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = join(
  process.cwd(),
  'scripts/security/check-p1-final-evidence-files.mjs',
);

const temporaryDirectories: string[] = [];

function createWorkspace(overrides: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'p1-final-evidence-environment-'));
  temporaryDirectories.push(root);

  const evidencePath = join(
    root,
    'docs/security/evidence/p1/sbom-artifact-attestation.json',
  );
  mkdirSync(dirname(evidencePath), { recursive: true });

  const evidence = {
    schemaVersion: 1,
    controlId: 'P1-06',
    control: 'sbom-artifact-attestation',
    status: 'Complete',
    evidenceKind: 'final-p1-control-evidence',
    generatedFromRealEvidence: true,
    productionValidated: true,
    generatedAt: '2026-07-13T10:00:00Z',
    reviewedAt: '2026-07-13T10:05:00Z',
    reviewer: 'Security reviewer',
    nextReviewDue: '2026-10-13',
    environment: 'production',
    targetEnvironment: 'production',
    validation: {
      result: 'pass',
      validatedAt: '2026-07-13T10:00:00Z',
      validator: 'GitHub Actions production verification',
      method: 'Reviewed the production workflow and its committed evidence artifacts.',
    },
    artifacts: [
      {
        type: 'workflow-run',
        reference: 'GitHub Actions run 123456',
        description: 'Production verification workflow result.',
        collectedAt: '2026-07-13T10:00:00Z',
      },
    ],
    ...overrides,
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return root;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('P1 final evidence production binding', () => {
  it('accepts final evidence explicitly bound to production', () => {
    const root = createWorkspace();
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('valid final evidence structure');
  });

  it('rejects evidence collected from a non-production environment', () => {
    const root = createWorkspace({ environment: 'staging' });
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'environment must be production for final P1 evidence',
    );
  });

  it('rejects evidence targeting a non-production environment', () => {
    const root = createWorkspace({ targetEnvironment: 'staging' });
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'targetEnvironment must be production for final P1 evidence',
    );
  });
});
