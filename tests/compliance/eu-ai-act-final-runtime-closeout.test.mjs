import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBundle, validateInputs } from '../../scripts/compliance/generate-eu-ai-act-final-runtime-bundle.mjs';

const sha = 'a'.repeat(40);
const workflowSource = readFileSync(resolve('.github/workflows/eu-ai-act-final-runtime-closeout.yml'), 'utf8');
const safeCoverage = {
  repository: 'renanescola40-afk/eurocomply_saas',
  targetSha: sha,
  scores: { implementationCoverage: 100, ciVerifiedCoverage: 100, runtimeEvidenceCoverage: 80 },
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

  it('rejects a synthetic baseline that attempts to fall below the deployed-proof boundary', () => {
    const validation = validateInputs({
      targetSha: sha,
      runId: '123',
      repository: 'renanescola40-afk/eurocomply_saas',
      safeCoverage: {
        ...safeCoverage,
        scores: { ...safeCoverage.scores, runtimeEvidenceCoverage: 79 },
      },
      providerProof: verified,
      platformProof: verified,
      strict: false,
    });
    expect(validation.groups.readiness).toContain('safe runtime coverage must be at least 80');
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

  it('consumes Legal Rules runtime proof only from a trusted immutable exact-SHA Actions artifact', () => {
    expect(workflowSource).toContain('actions/artifacts?name=${artifact_name}&per_page=100');
    expect(workflowSource).toContain('.workflow_run.head_sha == $sha');
    expect(workflowSource).toContain("= 'Legal Rules Runtime Validation'");
    expect(workflowSource).toContain("= 'success'");
    expect(workflowSource).toContain('deployment_status|workflow_dispatch');
    expect(workflowSource).toContain('actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c');
    expect(workflowSource).toContain("validateLegalRulesRuntimeEvidenceDocument(document, process.env.TARGET_SHA)");
    expect(workflowSource).toContain("steps.legal_rules.outputs.found == 'true'");
    expect(workflowSource).toContain('${{ env.SAFE_EVIDENCE_ROOT }},${{ env.RUNTIME_EVIDENCE_ROOT }}');
  });
});
