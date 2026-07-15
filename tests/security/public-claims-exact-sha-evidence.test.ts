import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const root = process.cwd();
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('exact-SHA public claims evidence', () => {
  it('emits a hashed report covering trust, security, and compliance surfaces', () => {
    const directory = mkdtempSync(join(tmpdir(), 'public-claims-evidence-'));
    temporaryDirectories.push(directory);
    const reportPath = join(directory, 'report.json');
    const targetSha = 'a'.repeat(40);

    const result = spawnSync(
      process.execPath,
      ['scripts/security/check-public-claims.mjs', '--report', reportPath],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PUBLIC_CLAIMS_TARGET_SHA: targetSha },
      },
    );

    if (result.status !== 0) {
      throw new Error(`Claims evidence generation failed:\n${result.stdout}\n${result.stderr}`);
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
      status: string;
      outcome: string;
      targetSha: string;
      filesScanned: number;
      policyDigest: string;
      contentDigest: string;
      checks: Array<{ name: string; passed: boolean; files: string[] }>;
      files: Array<{ path: string; sha256: string }>;
    };

    expect(report.status).toBe('Complete');
    expect(report.outcome).toBe('passed');
    expect(report.targetSha).toBe(targetSha);
    expect(report.filesScanned).toBeGreaterThan(0);
    expect(report.policyDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(report.contentDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(report.checks.map((check) => check.name)).toEqual([
      'trustCenter',
      'securityPage',
      'complianceClaims',
    ]);
    expect(report.checks.every((check) => check.passed && check.files.length > 0)).toBe(true);
    expect(report.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256))).toBe(true);
  });

  it('binds the workflow artifact and enterprise collector to the exact head SHA', () => {
    const workflow = readFileSync('.github/workflows/public-claims-guard.yml', 'utf8');
    const collector = readFileSync('scripts/enterprise/capture-github-checks-evidence.mjs', 'utf8');
    const generator = readFileSync('scripts/enterprise/generate-readiness-scorecard.mjs', 'utf8');
    const overrides = JSON.parse(readFileSync('docs/enterprise/evidence-overrides.json', 'utf8')) as {
      overrides: Array<{ controlId: string; evidence: { path: string; check: string } }>;
    };

    expect(workflow).toContain('name: Public Claims Guard');
    expect(workflow).toContain('PUBLIC_CLAIMS_TARGET_SHA: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('public-claims-evidence-${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('if-no-files-found: error');
    expect(workflow).toContain('retention-days: 90');

    expect(collector).toContain("'Public Claims Guard'");
    expect(collector).toContain("publicClaims: 'Public Claims Guard'");
    expect(generator).toContain("'publicClaims'");

    expect(overrides.overrides).toEqual([
      {
        controlId: 'TRU-01',
        evidence: {
          path: 'artifacts/trust-claims/trust-claims-validation.json',
          check: 'publicClaims',
        },
      },
      {
        controlId: 'TRU-02',
        evidence: {
          path: 'artifacts/trust-claims/trust-claims-validation.json',
          check: 'publicClaims',
        },
      },
      {
        controlId: 'TRU-03',
        evidence: {
          path: 'artifacts/trust-claims/trust-claims-validation.json',
          check: 'publicClaims',
        },
      },
    ]);
  });

  it('fails closed when the report target SHA is malformed', () => {
    const directory = mkdtempSync(join(tmpdir(), 'public-claims-invalid-sha-'));
    temporaryDirectories.push(directory);
    const reportPath = join(directory, 'report.json');

    const result = spawnSync(
      process.execPath,
      ['scripts/security/check-public-claims.mjs', '--report', reportPath],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PUBLIC_CLAIMS_TARGET_SHA: 'short-sha' },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PUBLIC_CLAIMS_TARGET_SHA must be a full 40-character commit SHA');
  });
});
