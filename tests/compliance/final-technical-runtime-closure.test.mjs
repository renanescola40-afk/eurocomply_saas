import { describe, expect, it } from 'vitest';
import { buildSafeRuntimeEvidence } from '../../scripts/compliance/generate-eu-ai-act-safe-runtime-bundle.mjs';
import { generateCoverage } from '../../scripts/compliance/generate-eu-ai-act-product-coverage.mjs';
import registry from '../../docs/compliance/eu-ai-act-product-coverage-registry.json' with { type: 'json' };

const sha = 'a'.repeat(40);
const evidence = buildSafeRuntimeEvidence({
  targetSha: sha,
  runId: '123456',
  repository: 'renanescola40-afk/eurocomply_saas',
  generatedAt: '2026-07-23T00:00:00.000Z',
});

describe('final technical runtime closure', () => {
  it('generates one exact-SHA runtime proof for every runtime-required workstream', () => {
    expect(evidence).toHaveLength(15);
    const ids = new Set(evidence.map((item) => item.document.workstreamId));
    for (const id of ['READINESS-SCORING', 'VENDOR-ASSURANCE', 'PLATFORM-CONTROLS']) {
      expect(ids.has(id)).toBe(true);
    }
    for (const item of evidence) {
      expect(item.document.targetSha).toBe(sha);
      expect(item.document.syntheticData).toBe(true);
      expect(item.document.status).toBe('VERIFIED');
      expect(item.document.limitations.length).toBeGreaterThan(0);
      expect(item.document.integrity.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('maps all generated paths to the canonical runtime registry', () => {
    const required = registry.workstreams.flatMap((item) => item.runtimeEvidence);
    const generated = evidence.map((item) => item.path);
    expect(new Set(generated)).toEqual(new Set(required));
  });

  it('keeps qualified review as the only remaining completion boundary', () => {
    const roots = ['/tmp/nonexistent-runtime-root'];
    const report = generateCoverage({ registry, targetSha: sha, evidenceRoots: roots });
    expect(report.scores.implementationCoverage).toBe(100);
    expect(report.scores.ciVerifiedCoverage).toBe(100);
    expect(report.releaseDecision).toBe('EU_AI_ACT_PRODUCT_COVERAGE_NO_GO');
  });
});
