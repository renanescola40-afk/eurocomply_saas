import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const validatorPath = resolve(process.cwd(), 'scripts/security/check-p0-runtime-evidence-files.mjs');
const temporaryRoots: string[] = [];

function runValidator(redactionConfirmation: string) {
  const root = mkdtempSync(join(tmpdir(), 'risck-comply-p0-redaction-'));
  temporaryRoots.push(root);
  const evidenceDir = join(root, 'docs/security/evidence/runtime');
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'deployment-smoke-validation.json'), `${JSON.stringify({
    evidenceItem: 'deployment-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    reviewer: 'RISCK COMPLY release automation',
    reviewedAt: '2026-08-12T08:00:00.000Z',
    summary: 'Exact-SHA production deployment smoke evidence completed with independently validated redaction metadata.',
    redactionConfirmation,
    evidenceLocations: ['scripts/release/run-deployment-smoke.mjs'],
    controlsVerified: ['deploymentSmokePassed'],
  }, null, 2)}\n`, { mode: 0o600 });

  return spawnSync(process.execPath, [validatorPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('P0 runtime redaction producer contract', () => {
  it.each([
    'Redaction confirmed: no token, cookie, authorization header, secret value, or secret environment variable name is written to this evidence file.',
    'Redaction confirmed: no token, cookie, authorization header, secret value, or raw rollback URL is written to this evidence file.',
  ])('accepts an exact redaction confirmation emitted by a protected production producer', (confirmation) => {
    const result = runValidator(confirmation);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Validated 1 runtime evidence file(s).');
  });

  it('continues to fail closed for arbitrary redaction prose', () => {
    const result = runValidator('Everything sensitive should probably be hidden.');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('missing redaction confirmation');
  });
});
