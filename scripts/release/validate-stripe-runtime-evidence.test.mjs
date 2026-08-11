import { describe, expect, it } from 'vitest';

import { validateStripeRuntimeEvidence } from './validate-stripe-runtime-evidence.mjs';

const now = new Date('2026-07-11T12:00:00Z');
const commitSha = 'a'.repeat(40);

function evidence(overrides = {}) {
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

function promotedEvidence(overrides = {}) {
  return {
    id: 'stripe-entitlement-runtime-proof',
    evidenceItem: 'stripe-billing-validation',
    status: 'Complete',
    validationStatus: 'passed',
    outcome: 'passed',
    reviewedAt: '2026-07-11T11:00:00Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha,
    runtimeProof: {
      executed: true,
      stripeTestModeConfirmed: true,
      signedWebhookDelivered: true,
      entitlementSnapshotObserved: true,
      canonicalSeatPolicyObserved: true,
      reconciliationLedgerObserved: true,
      replaySafetyObserved: true,
      sourceRunId: '123456789',
      sourceWorkflow: '.github/workflows/stripe-entitlement-runtime-proof.yml',
      sourceArtifactName: `stripe-entitlement-runtime-proof-${commitSha}`,
    },
    sourceEvidenceDigest: 'b'.repeat(64),
    sourceReplayDigest: 'c'.repeat(64),
    artifactDigest: 'd'.repeat(64),
    evidenceIntegrity: {
      placeholderOnly: false,
      runtimeProofInvented: false,
      containsSensitiveValues: false,
    },
    ...overrides,
  };
}

describe('validateStripeRuntimeEvidence', () => {
  it('accepts fresh legacy proof for main and the exact commit', () => {
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

  it('accepts source-bound promoted entitlement proof', () => {
    expect(validateStripeRuntimeEvidence(promotedEvidence(), { now, expectedCommitSha: commitSha })).toEqual([]);
  });

  it('rejects promoted evidence without exact source-run and replay provenance', () => {
    const value = promotedEvidence();
    value.runtimeProof.sourceRunId = '';
    value.runtimeProof.sourceArtifactName = 'stripe-entitlement-runtime-proof-wrong';
    value.sourceReplayDigest = '';
    const failures = validateStripeRuntimeEvidence(value, { now, expectedCommitSha: commitSha });
    expect(failures).toContain('runtimeProof.sourceRunId must be numeric');
    expect(failures).toContain('runtimeProof.sourceArtifactName must match the exact commit SHA');
    expect(failures).toContain('sourceReplayDigest must be SHA-256');
  });

  it('rejects promoted evidence if replay safety or integrity is not proven', () => {
    const value = promotedEvidence();
    value.runtimeProof.replaySafetyObserved = false;
    value.evidenceIntegrity.runtimeProofInvented = true;
    const failures = validateStripeRuntimeEvidence(value, { now });
    expect(failures).toContain('runtimeProof.replaySafetyObserved must be true');
    expect(failures).toContain('evidenceIntegrity.runtimeProofInvented must be false');
  });
});
