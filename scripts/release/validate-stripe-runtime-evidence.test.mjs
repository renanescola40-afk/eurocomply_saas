import { describe, expect, it } from 'vitest';

import { validateStripeRuntimeEvidence } from './validate-stripe-runtime-evidence.mjs';

const now = new Date('2026-07-11T12:00:00Z');

function evidence(overrides = {}) {
  const commitSha = 'a'.repeat(40);
  return {
    evidenceItem: 'stripe-billing-validation',
    status: 'Complete',
    validationStatus: 'passed',
    generatedAt: '2026-07-11T11:00:00Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha,
    runtimeProof: {
      runId: '123',
      headSha: commitSha,
      artifactDigest: `sha256:${'b'.repeat(64)}`,
    },
    checkout: { tested: true },
    portal: { tested: true },
    webhookSignature: { validSignatureRequiredBeforeDispatch: true },
    webhookIdempotency: { duplicateDoesNotMutateSubscriptionState: true },
    subscriptionSync: { customerMismatchRejected: true },
    ...overrides,
  };
}

describe('validateStripeRuntimeEvidence', () => {
  it('accepts fresh proof for main and the exact commit', () => {
    expect(validateStripeRuntimeEvidence(evidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateStripeRuntimeEvidence(evidence({ generatedAt: '2026-06-24T09:00:00Z' }), { now }))
      .toContain('generatedAt is older than 7 days');
  });

  it('rejects proof from a feature branch', () => {
    expect(validateStripeRuntimeEvidence(evidence({ branch: 'feature/old-proof' }), { now }))
      .toContain('branch must be main');
  });

  it('rejects a mismatched runtime head SHA', () => {
    const value = evidence();
    value.runtimeProof.headSha = 'c'.repeat(40);
    expect(validateStripeRuntimeEvidence(value, { now })).toContain('runtimeProof.headSha must match commitSha');
  });

  it('rejects incomplete webhook idempotency proof', () => {
    const value = evidence();
    value.webhookIdempotency.duplicateDoesNotMutateSubscriptionState = false;
    expect(validateStripeRuntimeEvidence(value, { now }))
      .toContain('webhookIdempotency.duplicateDoesNotMutateSubscriptionState must be true');
  });
});
