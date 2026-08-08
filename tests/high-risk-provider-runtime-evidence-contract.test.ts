import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/high-risk-provider-runtime-evidence.yml', 'utf8');
const generator = readFileSync('scripts/compliance/generate-high-risk-provider-runtime-evidence.mjs', 'utf8');
const validator = readFileSync('scripts/compliance/validate-high-risk-provider-runtime-evidence.mjs', 'utf8');
const registry = readFileSync('docs/compliance/eu-ai-act-product-coverage-registry.json', 'utf8');
const manifest = readFileSync('docs/compliance/evidence/manifests/high-risk-provider-runtime-evidence-manifest.json', 'utf8');

describe('high-risk provider exact-SHA runtime evidence', () => {
  it('runs focused product and operational tests before evidence generation', () => {
    expect(workflow).toContain('src/server/ai-governance/high-risk-provider-data-governance.test.ts');
    expect(workflow).toContain('tests/provider-data-operational-contract.test.ts');
    expect(workflow.indexOf('Focused high-risk provider tests')).toBeLessThan(workflow.indexOf('Generate exact-SHA evidence'));
  });

  it('binds evidence to the exact SHA and an integrity digest', () => {
    expect(generator).toContain("targetSha");
    expect(generator).toContain("sourceDigest");
    expect(generator).toContain("integritySha256");
    expect(validator).toContain("evidence.targetSha !== targetSha");
    expect(validator).toContain("integritySha256 !== digest(withoutIntegrity)");
  });

  it('keeps synthetic CI proof separate from customer and legal proof', () => {
    expect(generator).toContain("syntheticData: true");
    expect(generator).toContain("customerFacingProof: false");
    expect(generator).toContain('does not validate customer dataset truth');
    expect(manifest).toContain('qualifiedReviewReplaced');
    expect(manifest).toContain('false');
  });

  it('promotes only the dedicated provider evidence path in the canonical scorecard', () => {
    const parsed = JSON.parse(registry);
    const workstream = parsed.workstreams.find((item: { id: string }) => item.id === 'HIGH-RISK-PROVIDER');
    expect(workstream.runtimeEvidence).toEqual(['docs/security/evidence/runtime/high-risk-provider-validation.json']);
    expect(workstream.runtimeEvidenceAcceptance?.exactDeploymentShaRequired).toBe(true);
    expect(workstream.runtimeEvidenceAcceptance?.integritySha256Required).toBe(true);
  });
});
