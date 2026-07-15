import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { applySecurityResponseStatus } from '../../scripts/release/record-security-response-final-evidence.mjs';
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
      { name: 'lastCommitValidated', passed: true, details: { sha } },
      { name: 'buildShaRegistered', passed: true, details: { sha } },
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
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
    },
    ...overrides,
  };
}

function runtimeShaEvidence(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'risck-comply.runtime-release-sha-validation.v1',
    evidenceItem: 'runtime-release-sha-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    targetHost: 'example.invalid',
    expectedCommitSha: sha,
    expectedBuildSha: sha,
    observedCommitSha: sha,
    observedCommitShaMatchedExpected: true,
    checks: [{ name: 'runtimeCommitShaMatchesExpected', passed: true }],
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawNetworkPayloadStored: false,
      mismatchedObservedShaStored: false,
    },
    ...overrides,
  };
}

describe('runtime security response evidence', () => {
  it('derives complete evidence only from fresh exact-SHA smoke and host-bound runtime proof', () => {
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
      details: {
        targetResults: [
          {
            targetHost: 'example.invalid',
            shaBound: true,
            runtimeCheckPassed: true,
            passed: true,
          },
        ],
      },
    });
    expect(result.securityHeaders.runtimeShaBinding).toMatchObject({
      targetHost: 'example.invalid',
      fresh: true,
      checksPassed: true,
      failuresEmpty: true,
      passed: true,
    });
    expect(result.noStore.status).toBe('Complete');
    expect(result.noStore.checks[0]).toMatchObject({ name: 'noStore', passed: true });
  });

  it('fails closed when deployment commit or build SHA differs from the release SHA', () => {
    const expectedSha = 'b'.repeat(40);
    const commitMismatch = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence({
        expectedCommitSha: expectedSha,
        expectedBuildSha: expectedSha,
        observedCommitSha: expectedSha,
      }),
      expectedSha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(commitMismatch.securityHeaders.status).toBe('Open');
    expect(commitMismatch.noStore.status).toBe('Open');
    expect(commitMismatch.securityHeaders.sourceEvidence.exactCommitShaMatch).toBe(false);

    const buildMismatch = buildSecurityResponseEvidence(
      smokeEvidence({
        globalChecks: [
          { name: 'lastCommitValidated', passed: true, details: { sha } },
          { name: 'buildShaRegistered', passed: true, details: { sha: 'b'.repeat(40) } },
        ],
      }),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(buildMismatch.securityHeaders.status).toBe('Open');
    expect(buildMismatch.securityHeaders.sourceEvidence.exactBuildShaMatch).toBe(false);
  });

  it('fails closed when protected runtime SHA proof is missing, mismatched, or internally failed', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence({
        status: 'Open',
        outcome: 'failed',
        observedCommitSha: null,
        observedCommitShaMatchedExpected: false,
        checks: [{ name: 'runtimeCommitShaMatchesExpected', passed: false }],
        failures: ['runtimeCommitShaMatchesExpected'],
      }),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Open');
    expect(result.noStore.status).toBe('Open');
    expect(result.securityHeaders.runtimeShaBinding.passed).toBe(false);
  });

  it('fails closed when either source artifact is stale', () => {
    const staleSmoke = buildSecurityResponseEvidence(
      smokeEvidence(),
      runtimeShaEvidence(),
      sha,
      {
        generatedAt: '2026-07-15T11:00:01.000Z',
        maxSourceAgeMs: 60 * 60 * 1000,
      },
    );

    expect(staleSmoke.securityHeaders.status).toBe('Open');
    expect(staleSmoke.securityHeaders.sourceEvidence.fresh).toBe(false);

    const staleBinding = buildSecurityResponseEvidence(
      smokeEvidence({ generatedAt: '2026-07-15T10:55:00.000Z' }),
      runtimeShaEvidence({ generatedAt }),
      sha,
      {
        generatedAt: '2026-07-15T11:00:01.000Z',
        maxSourceAgeMs: 60 * 60 * 1000,
      },
    );

    expect(staleBinding.securityHeaders.status).toBe('Open');
    expect(staleBinding.securityHeaders.runtimeShaBinding.fresh).toBe(false);
  });

  it('requires every smoke target to match the protected runtime host', () => {
    const mismatchedHost = buildSecurityResponseEvidence(
      smokeEvidence({
        targets: [
          {
            baseUrl: 'https://other.example.invalid/path?token=redacted',
            detailedChecks: [
              { name: 'securityHeadersPresent', passed: true },
              { name: 'sensitiveApisHaveNoStore', passed: true },
              { name: 'privateRoutesHaveNoStore', passed: true },
            ],
          },
        ],
      }),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(mismatchedHost.securityHeaders.status).toBe('Open');
    expect(mismatchedHost.securityHeaders.checks[0].details.targetResults[0]).toMatchObject({
      targetHost: 'other.example.invalid',
      shaBound: false,
      passed: false,
    });

    const firstTarget = (smokeEvidence().targets as Array<Record<string, unknown>>)[0];
    const multipleHosts = buildSecurityResponseEvidence(
      smokeEvidence({
        targets: [
          firstTarget,
          {
            baseUrl: 'https://preview.example.invalid',
            detailedChecks: [
              { name: 'securityHeadersPresent', passed: true },
              { name: 'sensitiveApisHaveNoStore', passed: true },
              { name: 'privateRoutesHaveNoStore', passed: true },
            ],
          },
        ],
      }),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(multipleHosts.securityHeaders.status).toBe('Open');
    expect(multipleHosts.securityHeaders.checks[0].details.targetResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetHost: 'example.invalid', shaBound: true }),
        expect.objectContaining({ targetHost: 'preview.example.invalid', shaBound: false }),
      ]),
    );
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

  it('stores only normalized hosts and no raw deployment URLs', () => {
    const result = buildSecurityResponseEvidence(
      smokeEvidence({
        targets: [
          {
            baseUrl: 'https://example.invalid/some/path?secret=value#fragment',
            detailedChecks: [
              { name: 'securityHeadersPresent', passed: true },
              { name: 'sensitiveApisHaveNoStore', passed: true },
              { name: 'privateRoutesHaveNoStore', passed: true },
            ],
          },
        ],
      }),
      runtimeShaEvidence(),
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secret=value');
    expect(serialized).not.toContain('/some/path');
    expect(result.securityHeaders.evidenceIntegrity.rawUrlsStored).toBe(false);
  });

  it('records successful security response evidence without weakening final validation', () => {
    const result = applySecurityResponseStatus(
      { status: 'Complete', outcome: 'passed', metadataFailures: [] },
      { passed: true, generatedAt },
    );

    expect(result.status).toBe('Complete');
    expect(result.outcome).toBe('passed');
    expect(result.securityResponseEvidence).toMatchObject({
      status: 'Complete',
      outcome: 'passed',
      generatedAt,
    });
  });

  it('downgrades final validation when response evidence fails', () => {
    const result = applySecurityResponseStatus(
      { status: 'Complete', outcome: 'passed', overallResult: 'passed' },
      { passed: false, generatedAt },
    );

    expect(result).toMatchObject({
      status: 'Open',
      outcome: 'failed',
      overallResult: 'failed',
      securityResponseEvidence: {
        status: 'Open',
        outcome: 'failed',
        generatedAt,
      },
    });
    expect(result.releaseGate).toContain('No-Go');
    expect(result.metadataFailures).toHaveLength(1);
  });

  it('derives evidence after each strict runner and before the protected scorecard step', () => {
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
      const strictRunner = block.indexOf(runner);
      const finalization = block.indexOf('await finalizeSecurityResponseEvidence();');

      expect(strictRunner).toBeGreaterThan(-1);
      expect(finalization).toBeGreaterThan(strictRunner);
    }

    expect(source).toContain("runNodeScript('scripts/release/verify-runtime-release-sha.mjs');");
    expect(source).toContain('recordSecurityResponseFinalEvidence({ passed: true })');
    expect(source).toContain('recordSecurityResponseFinalEvidence({ passed: false })');
    expect(source).not.toContain("runNodeScript('scripts/release/run-deployment-smoke.mjs');");
    expect(source).not.toContain("import('./verify-runtime-release-sha.mjs')");

    const workflow = readFileSync('.github/workflows/public-production-final.yml', 'utf8');
    expect(workflow.indexOf('Run public production final gate')).toBeLessThan(
      workflow.indexOf('Generate scorecard from the same protected runtime run'),
    );
  });
});
