import { describe, expect, it } from 'vitest';

import { validateStepUpRuntimeEvidence } from './validate-step-up-runtime-evidence.mjs';

const now = new Date('2026-07-11T11:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'step-up-mfa-validation',
    status: 'Complete',
    generatedAt: '2026-07-11T10:00:00Z',
    runtimeValidation: {
      providerConfigured: true,
      providerProof: { present: true },
      targetEnvironment: true,
    },
    acceptanceCriteria: {
      releaseEnterpriseBlockedIfProviderProofAbsent: true,
    },
    evidenceIntegrity: {
      placeholderOnly: false,
      realRuntimeEvidenceAttached: true,
    },
    verificationProvenance: {
      method: 'github_actions',
      reference: 'actions/runs/123',
      verifiedAt: '2026-07-11T10:30:00Z',
      commitSha: 'a'.repeat(40),
    },
    ...overrides,
  };
}

describe('validateStepUpRuntimeEvidence', () => {
  it('accepts fresh complete provider proof bound to a commit', () => {
    expect(validateStepUpRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateStepUpRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T10:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects missing live provider proof', () => {
    const evidence = completeEvidence();
    evidence.runtimeValidation.providerProof.present = false;
    expect(validateStepUpRuntimeEvidence(evidence, { now })).toContain(
      'runtimeValidation.providerProof.present must be true',
    );
  });

  it('rejects placeholder complete evidence', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.placeholderOnly = true;
    expect(validateStepUpRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.placeholderOnly must be false',
    );
  });

  it('rejects evidence not executed against the target environment', () => {
    const evidence = completeEvidence();
    evidence.runtimeValidation.targetEnvironment = false;
    expect(validateStepUpRuntimeEvidence(evidence, { now })).toContain(
      'runtimeValidation.targetEnvironment must be true',
    );
  });

  it('rejects provenance without an exact commit SHA', () => {
    const evidence = completeEvidence();
    evidence.verificationProvenance.commitSha = 'main';
    expect(validateStepUpRuntimeEvidence(evidence, { now })).toContain(
      'verificationProvenance.commitSha must be a full commit SHA',
    );
  });

  it('allows non-Complete evidence to remain honestly blocked', () => {
    const evidence = completeEvidence({ status: 'Exception' });
    evidence.runtimeValidation.providerProof.present = false;
    expect(validateStepUpRuntimeEvidence(evidence, { now })).toEqual([]);
  });
});
