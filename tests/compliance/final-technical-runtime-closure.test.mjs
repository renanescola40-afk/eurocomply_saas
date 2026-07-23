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

describe('bounded technical runtime promotion', () => {
  it('generates only the twelve safe exact-SHA runtime proofs', () => {
    expect(evidence).toHaveLength(12);
    const ids = new Set(evidence.map((item) => item.document.workstreamId));
    for (const reserved of ['READINESS-SCORING', 'VENDOR-ASSURANCE', 'PLATFORM-CONTROLS']) {
      expect(ids.has(reserved)).toBe(false);
    }
    for (const item of evidence) {
      expect(item.document.targetSha).toBe(sha);
      expect(item.document.syntheticData).toBe(true);
      expect(item.document.status).toBe('VERIFIED');
      expect(item.document.limitations.length).toBeGreaterThan(0);
      expect(item.document.integrity.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('maps generated paths only to the safe subset of the runtime registry', () => {
    const generated = new Set(evidence.map((item) => item.path));
    const reservedPaths = new Set([
      'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json',
      'docs/security/evidence/runtime/provider-failure-classification.json',
      'docs/security/evidence/runtime/branch-protection-validation.json',
    ]);
    for (const path of generated) expect(reservedPaths.has(path)).toBe(false);
    expect(generated.size).toBe(12);
  });

  it('keeps final runtime and qualified review boundaries open', () => {
    const report = generateCoverage({ registry, targetSha: sha, evidenceRoots: ['/tmp/nonexistent-runtime-root'] });
    expect(report.scores.implementationCoverage).toBe(100);
    expect(report.scores.ciVerifiedCoverage).toBe(100);
    expect(report.releaseDecision).toBe('EU_AI_ACT_PRODUCT_COVERAGE_NO_GO');
  });
});
