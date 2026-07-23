import { describe, expect, it } from 'vitest';
import { buildBundle, validateInputs } from '../../scripts/compliance/generate-eu-ai-act-final-runtime-bundle.mjs';

const sha = 'a'.repeat(40);
const safeCoverage = {
  repository: 'renanescola40-afk/eurocomply_saas',
  targetSha: sha,
  scores: { implementationCoverage: 100, ciVerifiedCoverage: 100, runtimeEvidenceCoverage: 84 },
  releaseDecision: 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO',
};
const verified = { status: 'VERIFIED', targetSha: sha, source: 'test' };

describe('EU AI Act final runtime closeout', () => {
  it('promotes all final runtime controls when every proof matches the exact SHA', () => {
    const result = buildBundle({
      targetSha: sha,
      runId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      safeCoverage,
      providerProof: verified,
      platformProof: verified,
      strict: true,
    });
    expect(result.failures).toEqual([]);
    expect(result.accepted).toEqual(['READINESS-SCORING', 'VENDOR-ASSURANCE', 'PLATFORM-CONTROLS']);
    expect(Object.keys(result.docs)).toHaveLength(3);
  });

  it('keeps valid readiness and provider evidence in report mode when platform proof is blocked', () => {
    const result = buildBundle({
      targetSha: sha,
      runId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      safeCoverage,
      providerProof: verified,
      platformProof: { status: 'BLOCKED', targetSha: sha },
      strict: false,
    });
    expect(result.accepted).toEqual(['READINESS-SCORING', 'VENDOR-ASSURANCE']);
    expect(result.failureGroups.platform).toContain('platform proof missing');
  });

  it('rejects stale cross-SHA provider evidence', () => {
    const validation = validateInputs({
      targetSha: sha,
      runId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      safeCoverage,
      providerProof: { ...verified, targetSha: 'b'.repeat(40) },
      platformProof: verified,
      strict: false,
    });
    expect(validation.groups.provider).toContain('provider failure proof SHA mismatch');
  });

  it('fails closed in strict mode when branch protection cannot be verified', () => {
    expect(() => buildBundle({
      targetSha: sha,
      runId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      safeCoverage,
      providerProof: verified,
      platformProof: { status: 'BLOCKED', targetSha: sha },
      strict: true,
    })).toThrow(/platform proof missing/);
  });
});
