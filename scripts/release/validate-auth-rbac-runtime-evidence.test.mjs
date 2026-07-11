import { describe, expect, it } from 'vitest';

import {
  requiredBlockingEvidence,
  validateAuthRbacRuntimeEvidence,
} from './validate-auth-rbac-runtime-evidence.mjs';

const now = new Date('2026-07-11T11:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'auth-rbac-final-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T10:00:00Z',
    primaryAuthStack: 'supabase-auth',
    releaseDecision: 'Go',
    goNoGo: { status: 'GO' },
    runtimeEvidenceStatus: 'executed_against_target_environment',
    evidenceIntegrity: {
      placeholderOnly: false,
      realRuntimeEvidenceAttached: true,
      customerFacingProof: true,
    },
    blockingEvidence: Object.fromEntries(
      requiredBlockingEvidence.map((key) => [key, 'passed']),
    ),
    verificationProvenance: {
      method: 'github_actions',
      reference: 'actions/runs/123',
      verifiedAt: '2026-07-11T10:30:00Z',
      commitSha: 'a'.repeat(40),
    },
    ...overrides,
  };
}

describe('validateAuthRbacRuntimeEvidence', () => {
  it('accepts fresh complete target-runtime evidence', () => {
    expect(validateAuthRbacRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateAuthRbacRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T10:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects missing MFA provider proof', () => {
    const evidence = completeEvidence();
    evidence.blockingEvidence.stepUpMfaProviderProof = 'not_executed';
    expect(validateAuthRbacRuntimeEvidence(evidence, { now })).toContain(
      'blockingEvidence.stepUpMfaProviderProof must be complete/passed',
    );
  });

  it('rejects placeholder complete evidence', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.placeholderOnly = true;
    expect(validateAuthRbacRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.placeholderOnly must be false',
    );
  });

  it('rejects provenance without an exact commit SHA', () => {
    const evidence = completeEvidence();
    evidence.verificationProvenance.commitSha = 'main';
    expect(validateAuthRbacRuntimeEvidence(evidence, { now })).toContain(
      'verificationProvenance.commitSha must be a full commit SHA',
    );
  });
});
