import { describe, expect, it } from 'vitest';

import { validateStepUpMfaRuntimeEvidence } from './validate-step-up-mfa-runtime-evidence.mjs';

const now = new Date('2026-07-11T11:00:00Z');
const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

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
      commitSha: SHA,
      verifiedAt: '2026-07-11T10:30:00Z',
    },
    ...overrides,
  };
}

function completeV2Evidence(overrides = {}) {
  return {
    schema: 'risck-comply.step-up-mfa-runtime-evidence.v2',
    evidenceItem: 'step-up-mfa-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T10:00:00Z',
    repository: REPOSITORY,
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    runtimeConfiguration: {
      providerConfigured: true,
    },
    runtimeValidation: {
      status: 'Complete',
      ephemeralFixtureCreated: true,
      signedIn: true,
      factorEnrolled: true,
      verifiedFactorAvailable: true,
      challengeCreated: true,
      verificationSucceeded: true,
      aal2Observed: true,
      sessionUserMatched: true,
      signedOut: true,
      fixtureCleanupVerified: true,
    },
    acceptanceCriteria: {
      dedicatedSigningSecretRequired: true,
      ephemeralFixtureCreated: true,
      syntheticFixtureSignedIn: true,
      totpFactorEnrolled: true,
      verifiedTotpFactorAvailable: true,
      providerChallengeCreated: true,
      totpVerificationSucceeded: true,
      aal2Observed: true,
      sessionUserMatched: true,
      fixtureSessionRevoked: true,
      fixtureCleanupVerified: true,
      exactReleaseSha: true,
      protectedMainBranch: true,
      protectedWorkflowProvenance: true,
    },
    provenance: {
      source: 'github_actions',
      runId: '123456789',
      exactShaBound: true,
      branchBound: true,
      workflowProvenance: true,
    },
    evidenceIntegrity: {
      placeholderOnly: false,
      rawSecretsStored: false,
      rawTokensStored: false,
      rawUserIdentifiersStored: false,
      factorIdentifiersStored: false,
      challengeIdentifiersStored: false,
      rawProviderPayloadStored: false,
      ephemeralUserRemoved: true,
    },
    ...overrides,
  };
}

describe('validateStepUpMfaRuntimeEvidence', () => {
  it('accepts fresh complete provider proof bound to a commit', () => {
    expect(validateStepUpMfaRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('accepts v2 only when the disposable MFA lifecycle and cleanup are fully proven', () => {
    expect(validateStepUpMfaRuntimeEvidence(completeV2Evidence(), {
      now,
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('rejects v2 artifacts that omit enrollment or disposable-user cleanup', () => {
    const missingEnrollment = completeV2Evidence();
    missingEnrollment.runtimeValidation.factorEnrolled = false;
    missingEnrollment.acceptanceCriteria.totpFactorEnrolled = false;
    expect(validateStepUpMfaRuntimeEvidence(missingEnrollment, { now })).toEqual(expect.arrayContaining([
      'runtimeValidation.factorEnrolled must be true',
      'acceptanceCriteria.totpFactorEnrolled must be true',
    ]));

    const missingCleanup = completeV2Evidence();
    missingCleanup.runtimeValidation.fixtureCleanupVerified = false;
    missingCleanup.acceptanceCriteria.fixtureCleanupVerified = false;
    missingCleanup.evidenceIntegrity.ephemeralUserRemoved = false;
    expect(validateStepUpMfaRuntimeEvidence(missingCleanup, { now })).toEqual(expect.arrayContaining([
      'runtimeValidation.fixtureCleanupVerified must be true',
      'acceptanceCriteria.fixtureCleanupVerified must be true',
      'evidenceIntegrity.ephemeralUserRemoved must be true',
    ]));
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
