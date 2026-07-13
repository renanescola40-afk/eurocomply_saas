import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = join(
  process.cwd(),
  'scripts/security/check-p1-evidence-index.mjs',
);

const controls = [
  ['P1-01', 'sso-saml-oidc', 'docs/security/evidence/p1/sso-saml-oidc.json'],
  ['P1-02', 'admin-mfa-required', 'docs/security/evidence/p1/admin-mfa-required.json'],
  ['P1-03', 'step-up-sensitive-actions', 'docs/security/evidence/p1/step-up-sensitive-actions.json'],
  ['P1-04', 'distributed-rate-limit-sensitive-endpoints', 'docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json'],
  ['P1-05', 'dast-automated', 'docs/security/evidence/p1/dast-automated.json'],
  ['P1-06', 'sbom-artifact-attestation', 'docs/security/evidence/p1/sbom-artifact-attestation.json'],
  ['P1-07', 'backup-restore-tested', 'docs/security/evidence/p1/backup-restore-tested.json'],
  ['P1-08', 'centralized-logging-alerts', 'docs/security/evidence/p1/centralized-logging-alerts.json'],
  ['P1-09', 'verifiable-production-audit-chain', 'docs/security/evidence/p1/verifiable-production-audit-chain.json'],
  ['P1-10', 'waf-cdn-ddos', 'docs/security/evidence/p1/waf-cdn-ddos.json'],
] as const;

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createIndexWorkspace(complete: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'p1-evidence-index-'));
  temporaryDirectories.push(root);

  const index = {
    schemaVersion: 1,
    phase: 'P1 Enterprise Security',
    status: complete ? 'Complete' : 'Open',
    generatedFromRealEvidence: complete,
    controls: controls.map(([controlId, control, evidencePath]) => ({
      controlId,
      control,
      evidencePath,
      status: complete ? 'Complete' : 'Open',
      ...(complete
        ? {
            reviewedAt: '2026-07-13T10:00:00Z',
            reviewer: 'Security reviewer',
            nextReviewDue: '2026-10-13',
          }
        : {}),
    })),
  };

  if (complete) {
    for (const [, , evidencePath] of controls) {
      const absoluteEvidencePath = join(root, evidencePath);
      mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
      writeFileSync(absoluteEvidencePath, '{}\n');
    }
  }

  const indexPath = join(root, 'P1_EVIDENCE_INDEX.json');
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  return { root, indexPath };
}

describe('P1 evidence index strict mode', () => {
  it('treats --strict as a flag and rejects an incomplete index', () => {
    const { root, indexPath } = createIndexWorkspace(false);
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--strict', indexPath],
      { cwd: root, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('strict mode requires index status Complete');
    expect(result.stderr).not.toContain('index file is missing: --strict');
  });

  it('accepts a complete index with reviewed evidence in strict mode', () => {
    const { root, indexPath } = createIndexWorkspace(true);
    const result = spawnSync(
      process.execPath,
      [scriptPath, indexPath, '--strict'],
      { cwd: root, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('valid in strict mode');
  });
});
