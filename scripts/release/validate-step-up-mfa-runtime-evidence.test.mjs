import { describe, expect, it } from 'vitest';

import { validateStepUpMfaRuntimeEvidence } from './validate-step-up-mfa-runtime-evidence.mjs';

const now = new Date('2026-07-11T11:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'step-up-mfa-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T10:00:00Z',
    runtimeValidation: {
      providerConfigured: true,
      providerProof: { present: true },
      failClosedWithoutProvider: true,
      enterpriseReleaseBlockedWithoutProviderProof: true,
    },
    acceptanceCriteria: {
      releaseEnterpriseBlockedIfProviderProofAbsent: true,
    },
    positiveTests: {
      validSignedTokenAfterProviderPasses: true,
    },
    verification_provenance: {
      method: 'github_actions',
      reference: 'actions/run/123',
      commitSha: 'a'.repeat(40),
      verifiedAt: '2026-07-11T10:30:00Z',
    },
    ...overrides,
  };
}

describe('validateStepUpMfaRuntimeEvidence', () => {
  it('accepts fresh complete provider proof bound to a commit', () => {
    expect(validateStepUpMfaRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateStepUpMfaRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T10:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects complete evidence without provider proof', () => {
    const evidence = completeEvidence();
    evidence.runtimeValidation.providerProof.present = false;

    expect(validateStepUpMfaRuntimeEvidence(evidence, { now })).toContain(
      'runtimeValidation.providerProof.present must be true',
    );
  });

  it('rejects expired exceptions', () => {
    expect(
      validateStepUpMfaRuntimeEvidence(
        {
          evidenceItem: 'step-up-mfa-validation',
          status: 'Exception',
          generatedAt: '2026-07-10T10:00:00Z',
          exception: { expiresAt: '2026-07-10T23:59:59Z' },
        },
        { now },
      ),
    ).toContain('step-up MFA exception has expired');
  });

  it('rejects incomplete commit provenance', () => {
    const evidence = completeEvidence();
    evidence.verification_provenance.commitSha = 'abc123';

    expect(validateStepUpMfaRuntimeEvidence(evidence, { now })).toContain(
      'verification_provenance.commitSha must be a full 40-character SHA',
    );
  });
});
