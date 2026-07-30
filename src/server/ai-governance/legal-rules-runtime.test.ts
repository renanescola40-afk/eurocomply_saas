import { describe, expect, it } from 'vitest';

import { AI_ACT_LEGAL_RULES_VERSION } from './legal-rules';
import { buildLegalRulesRuntimeEvidence } from './legal-rules-runtime';

const SHA = 'a'.repeat(40);

describe('legal rules runtime evidence', () => {
  it('emits a deterministic PASS artifact for an exact deployed SHA', () => {
    const evidence = buildLegalRulesRuntimeEvidence({
      environment: 'preview',
      deploymentUrl: 'https://preview.example.com',
      deploymentSha: SHA,
      requestId: 'iad1::legal-rules-12345678',
      timestamp: '2026-07-30T12:00:00.000Z',
    });

    expect(evidence.status).toBe('PASS');
    expect(evidence.deploymentSha).toBe(SHA);
    expect(evidence.legalRulesVersion).toBe(AI_ACT_LEGAL_RULES_VERSION);
    expect(evidence.sourceRegulations).toContain('Regulation (EU) 2026/1744');
    expect(evidence.effectiveDate).toBe('2026-07-27');
    expect(evidence.rulesDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.testCases.every((testCase) => testCase.status === 'PASS')).toBe(true);
    expect(evidence.requestIds).toEqual(['iad1::legal-rules-12345678']);
  });

  it('fails closed when runtime provenance is unavailable', () => {
    const evidence = buildLegalRulesRuntimeEvidence({
      environment: 'unknown',
      deploymentUrl: 'not-a-url',
      deploymentSha: 'unknown',
      requestId: 'authorization=secret',
      timestamp: '2026-07-30T12:00:00.000Z',
    });

    expect(evidence.status).toBe('FAIL');
    expect(evidence.testCases.find((testCase) => testCase.id === 'deployment-sha-exact')?.status).toBe('FAIL');
    expect(evidence.testCases.find((testCase) => testCase.id === 'deployment-url-valid')?.status).toBe('FAIL');
    expect(evidence.requestIds[0]).toMatch(/^generated-[a-f0-9]{24}$/);
    expect(JSON.stringify(evidence)).not.toContain('authorization=secret');
  });

  it('is stable for identical inputs', () => {
    const input = {
      environment: 'production',
      deploymentUrl: 'https://www.risckcomply.com',
      deploymentSha: SHA,
      requestId: 'fra1::legal-rules-87654321',
      timestamp: '2026-07-30T12:00:00.000Z',
    };

    const first = buildLegalRulesRuntimeEvidence(input);
    const second = buildLegalRulesRuntimeEvidence(input);

    expect(first).toEqual(second);
    expect(first.artifactSha256).toBe(second.artifactSha256);
  });
});
