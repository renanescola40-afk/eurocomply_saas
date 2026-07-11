import { describe, expect, it } from 'vitest';
import { validateEnterpriseEnvRuntimeEvidence } from './validate-enterprise-env-runtime-evidence.mjs';

const now = new Date('2026-07-11T16:30:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'enterprise-release-env-readiness',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T16:00:00Z',
    releaseTarget: 'enterprise',
    noSecretsStored: true,
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29180000000',
      commitSha: 'a'.repeat(40),
    },
    checks: [
      { name: 'supabaseConfigured', required: true, passed: true },
      { name: 'stripeConfigured', required: true, passed: true },
    ],
    controlsVerified: ['Supabase configured', 'Stripe configured'],
    failures: [],
    evidenceIntegrity: {
      placeholderOnly: false,
      containsSensitiveValues: false,
      rawUrlsStored: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
    },
    ...overrides,
  };
}

describe('validateEnterpriseEnvRuntimeEvidence', () => {
  it('accepts fresh complete enterprise environment proof for main', () => {
    expect(validateEnterpriseEnvRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateEnterpriseEnvRuntimeEvidence(completeEvidence({ generatedAt: '2026-07-01T16:00:00Z' }), { now }))
      .toContain('generatedAt is older than 7 days');
  });

  it('rejects placeholder evidence marked complete', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.placeholderOnly = true;
    expect(validateEnterpriseEnvRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.placeholderOnly must be false');
  });

  it('rejects feature-branch provenance', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/example';
    expect(validateEnterpriseEnvRuntimeEvidence(evidence, { now }))
      .toContain('runtimeContext.branch must be main');
  });

  it('rejects a failed required check', () => {
    const evidence = completeEvidence();
    evidence.checks[0].passed = false;
    expect(validateEnterpriseEnvRuntimeEvidence(evidence, { now }))
      .toContain('required check supabaseConfigured must pass');
  });

  it('rejects stored raw URLs', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.rawUrlsStored = true;
    expect(validateEnterpriseEnvRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.rawUrlsStored must be false');
  });

  it('rejects evidence for a different commit when expected', () => {
    expect(validateEnterpriseEnvRuntimeEvidence(completeEvidence(), { now, expectedCommitSha: 'b'.repeat(40) }))
      .toContain(`runtime commit SHA must match ${'b'.repeat(40)}`);
  });
});
