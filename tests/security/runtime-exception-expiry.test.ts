import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const checker = join(process.cwd(), 'scripts/security/check-runtime-exception-expiry.mjs');

function createEvidenceDirectory() {
  const root = mkdtempSync(join(tmpdir(), 'runtime-exception-expiry-'));
  temporaryDirectories.push(root);
  const evidenceDir = join(root, 'runtime');
  mkdirSync(evidenceDir, { recursive: true });
  return evidenceDir;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('runtime exception expiry gate', () => {
  it('keeps the committed runtime evidence set free of expired exceptions', () => {
    expect(() => {
      execFileSync(process.execPath, [checker], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          RUNTIME_EVIDENCE_NOW: '2026-07-15T00:00:00.000Z',
        },
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('rejects expired exception evidence', () => {
    const evidenceDir = createEvidenceDirectory();
    writeFileSync(
      join(evidenceDir, 'expired.json'),
      JSON.stringify({
        evidenceItem: 'example',
        status: 'Exception',
        exception: { expiresAt: '2026-07-14T23:59:59.000Z' },
      }),
    );

    const result = spawnSync(process.execPath, [checker], {
      env: {
        ...process.env,
        RUNTIME_EVIDENCE_DIR: evidenceDir,
        RUNTIME_EVIDENCE_NOW: '2026-07-15T00:00:00.000Z',
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Exception evidence expired');
  });

  it('accepts a non-expired exception and rejects malformed expiry metadata', () => {
    const validDir = createEvidenceDirectory();
    writeFileSync(
      join(validDir, 'valid.json'),
      JSON.stringify({
        evidenceItem: 'example',
        status: 'Exception',
        exception: { expiresAt: '2026-07-16T00:00:00.000Z' },
      }),
    );

    const validResult = spawnSync(process.execPath, [checker], {
      env: {
        ...process.env,
        RUNTIME_EVIDENCE_DIR: validDir,
        RUNTIME_EVIDENCE_NOW: '2026-07-15T00:00:00.000Z',
      },
      encoding: 'utf8',
    });
    expect(validResult.status).toBe(0);

    const invalidDir = createEvidenceDirectory();
    writeFileSync(
      join(invalidDir, 'invalid.json'),
      JSON.stringify({
        evidenceItem: 'example',
        status: 'Exception',
        exception: { expiresAt: 'not-a-date' },
      }),
    );

    const invalidResult = spawnSync(process.execPath, [checker], {
      env: {
        ...process.env,
        RUNTIME_EVIDENCE_DIR: invalidDir,
        RUNTIME_EVIDENCE_NOW: '2026-07-15T00:00:00.000Z',
      },
      encoding: 'utf8',
    });
    expect(invalidResult.status).toBe(1);
    expect(invalidResult.stderr).toContain('invalid exception.expiresAt');
  });
});
