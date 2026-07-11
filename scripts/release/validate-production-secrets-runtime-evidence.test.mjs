import { describe, expect, it } from 'vitest';

import { validateProductionSecretsRuntimeEvidence } from './validate-production-secrets-runtime-evidence.mjs';

const now = new Date('2026-07-11T15:00:00Z');
const sha = 'a'.repeat(40);

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'production-secrets-provider-stores',
    status: 'Complete',
    generatedAt: '2026-07-11T14:00:00Z',
    valuesRedacted: true,
    runtimeContext: {
      generatedByGithubActions: true,
      githubRunId: '29160000000',
      commitSha: sha,
    },
    providersReviewed: ['github', 'vercel', 'supabase'].map((provider) => ({
      provider,
      environment: 'production',
      status: 'reviewed',
      evidenceLocation: `private:${provider}`,
    })),
    rotationOwner: 'security-automation',
    nextReviewDue: '2026-08-11T00:00:00Z',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawValuesStored: false,
      credentialsStored: false,
    },
    ...overrides,
  };
}

describe('validateProductionSecretsRuntimeEvidence', () => {
  it('accepts fresh redacted provider proof for the promoted commit', () => {
    expect(validateProductionSecretsRuntimeEvidence(completeEvidence(), { now, expectedCommitSha: sha })).toEqual([]);
  });

  it('rejects stale provider evidence', () => {
    expect(validateProductionSecretsRuntimeEvidence(
      completeEvidence({ generatedAt: '2026-06-21T00:00:00Z' }),
      { now, expectedCommitSha: sha },
    )).toContain('evidence timestamp is older than 7 days');
  });

  it('rejects commit-unbound provider evidence', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.commitSha = 'b'.repeat(40);
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now, expectedCommitSha: sha })).toContain(
      `runtime commit SHA must match ${sha}`,
    );
  });

  it('rejects missing production provider proof', () => {
    const evidence = completeEvidence();
    evidence.providersReviewed = evidence.providersReviewed.filter((entry) => entry.provider !== 'vercel');
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'providersReviewed must include vercel exactly once',
    );
  });

  it('rejects stored credentials', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.credentialsStored = true;
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.credentialsStored must be false',
    );
  });

  it('rejects expired rotation review', () => {
    expect(validateProductionSecretsRuntimeEvidence(
      completeEvidence({ nextReviewDue: '2026-07-10T00:00:00Z' }),
      { now },
    )).toContain('nextReviewDue must not be expired');
  });
});
