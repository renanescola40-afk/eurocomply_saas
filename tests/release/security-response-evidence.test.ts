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

describe('runtime security response evidence', () => {
  it('derives complete evidence only from a fresh exact-SHA deployment smoke', () => {
    const result = buildSecurityResponseEvidence(smokeEvidence(), sha, {
      generatedAt: '2026-07-15T10:05:00.000Z',
    });

    expect(result.securityHeaders.status).toBe('Complete');
    expect(result.securityHeaders.checks[0]).toMatchObject({
      name: 'securityHeaders',
      passed: true,
    });
    expect(result.noStore.status).toBe('Complete');
    expect(result.noStore.checks[0]).toMatchObject({
      name: 'noStore',
      passed: true,
    });
  });

  it('fails closed when the deployment smoke SHA differs from the release SHA', () => {
    const result = buildSecurityResponseEvidence(smokeEvidence(), 'b'.repeat(40), {
      generatedAt: '2026-07-15T10:05:00.000Z',
    });

    expect(result.securityHeaders.status).toBe('Open');
    expect(result.noStore.status).toBe('Open');
    expect(result.securityHeaders.sourceEvidence.exactShaMatch).toBe(false);
  });

  it('fails closed when the source evidence is stale', () => {
    const result = buildSecurityResponseEvidence(smokeEvidence(), sha, {
      generatedAt: '2026-07-15T11:00:01.000Z',
      maxSourceAgeMs: 60 * 60 * 1000,
    });

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
      sha,
      { generatedAt: '2026-07-15T10:05:00.000Z' },
    );

    expect(result.securityHeaders.status).toBe('Complete');
    expect(result.noStore.status).toBe('Open');
  });
});
