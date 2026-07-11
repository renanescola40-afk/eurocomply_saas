import { describe, expect, it } from 'vitest';

import { validateDeploymentRuntimeEvidence } from './validate-deployment-runtime-evidence.mjs';

const now = new Date('2026-07-11T14:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'deployment-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T13:00:00Z',
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      commitSha: 'a'.repeat(40),
      githubRunId: '123',
    },
    evidenceIntegrity: {
      placeholderOnly: false,
      containsSensitiveValues: false,
      customerFacingProof: true,
    },
    targets: [{
      passed: true,
      checks: {
        healthOk: true,
        readyProtected: true,
        readyOk: true,
        securityHeadersOk: true,
        sensitiveNoStoreOk: true,
      },
    }],
    smokeTargets: { passed: ['production'], failed: [] },
    ...overrides,
  };
}

describe('validateDeploymentRuntimeEvidence', () => {
  it('accepts fresh complete evidence for main', () => {
    expect(validateDeploymentRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateDeploymentRuntimeEvidence(completeEvidence({ generatedAt: '2026-07-01T13:00:00Z' }), { now }))
      .toContain('generatedAt is older than 7 days');
  });

  it('rejects non-main provenance', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/example';
    expect(validateDeploymentRuntimeEvidence(evidence, { now }))
      .toContain('runtimeContext.branch must be main');
  });

  it('rejects incomplete readiness proof', () => {
    const evidence = completeEvidence();
    evidence.targets[0].checks.readyProtected = false;
    expect(validateDeploymentRuntimeEvidence(evidence, { now }))
      .toContain('every target must prove protected /api/ready');
  });

  it('rejects missing security headers proof', () => {
    const evidence = completeEvidence();
    evidence.targets[0].checks.securityHeadersOk = false;
    expect(validateDeploymentRuntimeEvidence(evidence, { now }))
      .toContain('every target must prove security headers');
  });

  it('rejects missing no-store proof', () => {
    const evidence = completeEvidence();
    evidence.targets[0].checks.sensitiveNoStoreOk = false;
    expect(validateDeploymentRuntimeEvidence(evidence, { now }))
      .toContain('every target must prove no-store on sensitive responses');
  });

  it('rejects placeholder evidence', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.placeholderOnly = true;
    expect(validateDeploymentRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.placeholderOnly must be false');
  });
});
