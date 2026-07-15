import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildSecurityResponseEvidence } from '../../scripts/release/write-security-response-evidence.mjs';

const sha = 'a'.repeat(40);
const generatedAt = '2026-07-15T10:00:00.000Z';

function smokeEvidence(overrides: Record<string, unknown> = {}) {
  return {
    evidenceItem: 'deployment-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    globalChecks: [
      {
        name: 'lastCommitValidated',
        passed: true,
        details: { sha },
      },
    ],
    targets: [
      {
        baseUrl: 'https://example.invalid',
        detailedChecks: [
          { name: 'securityHeadersPresent', passed: true },
          { name: 'sensitiveApisHaveNoStore', passed: true },
          { name: 'privateRoutesHaveNoStore', passed: true },
        ],
      },
    ],
    ...overrides,
  };
}

function runtimeShaEvidence(overrides: Record<string, unknown> = {}) {
  return {
    evidenceItem: 'runtime-release-sha-validation',
    status: 'Complete',
    outcome: 'passed',
    expectedCommitSha: sha,
    observedCommitSha: sha,
    observedCommitShaMatchedExpected: true,
    ...overrides,
  };
}

describe('runtime security response evidence', () => {
  it('derives complete evidence only from a fresh exact-SHA deployment smoke and protected runtime proof', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Complete');
    expect(result.securityHeaders.checks[0]).toMatchObject({
      name: 'securityHeaders',
      passed: true,
    });
    expect(result.securityHeaders.runtimeShaBinding.passed).toBe(true);
    expect(result.noStore.status).toBe('Complete');
    expect(result.noStore.checks[0]).toMatchObject({
      name: 'noStore',
      passed: true,
    });
  });

  it('fails closed when the deployment smoke SHA differs from the release SHA', () => {
    const expectedSha = 'b'.repeat(40);
    const result = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence({
        expectedCommitSha: expectedSha,
        observedCommitSha: expectedSha,
      }),
      expectedSha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Open');
    expect(result.noStore.status).toBe('Open');
    expect(result.securityHeaders.sourceEvidence.exactShaMatch).toBe(false);
  });

  it('fails closed when protected runtime SHA proof is missing or mismatched', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence({
        status: 'Open',
        outcome: 'failed',
        observedCommitSha: null,
        observedCommitShaMatchedExpected: false,
      }),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Open');
    expect(result.noStore.status).toBe('Open');
    expect(result.securityHeaders.runtimeShaBinding.passed).toBe(false);
  });

  it('fails closed when the source evidence is stale', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence(),
      sha,
      {
        generatedAt: '2026-07-15T11:00:01.000Z',
        maxSourceAgeMs: 60 * 60 * 1000,
      },
    );

    expect(result.securityHeaders.status).toBe('Open');
    expect(result.noStore.status).toBe('Open');
    expect(result.securityHeaders.sourceEvidence.fresh).toBe(false);
  });

  it('keeps header and no-store outcomes independently fail closed', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence({
        targets: [
          {
            baseUrl: 'https://example.invalid',
            detailedChecks: [
              { name: 'securityHeadersPresent', passed: true },
              { name: 'sensitiveApisHaveNoStore', passed: false },
              { name: 'privateRoutesHaveNoStore', passed: true },
            ],
          },
        ],
      }),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Complete');
    expect(result.noStore.status).toBe('Open');
  });

  it('prepares before strict runners and refreshes evidence after their final smoke', () => {
    const source = readFileSync('scripts/release/run-public-production-release.mjs', 'utf8');
    const enterpriseStart = source.indexOf('if (enterpriseRequested)');
    const publicStart = source.indexOf("} else if (releaseTarget === 'public-production'");
    const unsupportedStart = source.indexOf('} else {', publicStart);
    const enterpriseBlock = source.slice(enterpriseStart, publicStart);
    const publicBlock = source.slice(publicStart, unsupportedStart);

    for (const [block, runner] of [
      [enterpriseBlock, "await import('./run-public-production-release-v2.mjs');"],
      [publicBlock, "await import('./run-public-production-release-final.mjs');"],
    ] as const) {
      const preparation = block.indexOf('await prepareSecurityResponseEvidence();');
      const strictRunner = block.indexOf(runner);
      const finalization = block.indexOf('await finalizeSecurityResponseEvidence();');

      expect(preparation).toBeGreaterThan(-1);
      expect(strictRunner).toBeGreaterThan(preparation);
      expect(finalization).toBeGreaterThan(strictRunner);
    }

    expect(source.match(/verifyRuntimeReleaseSha\(\);/g)).toHaveLength(2);
    expect(source.match(/await writeSecurityResponseEvidence\(\);/g)).toHaveLength(2);
    expect(source).toContain("runNodeScript('scripts/release/verify-runtime-release-sha.mjs');");
    expect(source).toContain("runNodeScript('scripts/release/run-deployment-smoke.mjs');");
    expect(source).not.toContain("import('./verify-runtime-release-sha.mjs')");
  });
});
