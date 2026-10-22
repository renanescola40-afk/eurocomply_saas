import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateStripeRuntimeEvidence } from '../../scripts/release/validate-stripe-runtime-evidence.mjs';

const now = new Date('2026-10-22T09:00:00.000Z');
const sha = 'a'.repeat(40);

function completeRuntimeProof() {
  return {
    evidenceItem: 'stripe-billing-validation',
    status: 'Complete',
    validationStatus: 'passed',
    generatedAt: '2026-10-22T08:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    commitSha: sha,
    runtimeProof: { runId: '123', headSha: sha, artifactDigest: `sha256:${'b'.repeat(64)}` },
    checkout: { tested: true },
    portal: { tested: true },
    webhookSignature: { validSignatureRequiredBeforeDispatch: true },
    webhookIdempotency: { duplicateDoesNotMutateSubscriptionState: true },
    subscriptionSync: { customerMismatchRejected: true },
  };
}

test('valid legacy exact-SHA runtime proof remains accepted', () => {
  assert.deepEqual(validateStripeRuntimeEvidence(completeRuntimeProof(), { now, expectedCommitSha: sha }), []);
});

for (const status of ['Open', 'Pending', 'Draft', '', null, undefined]) {
  test(`non-complete status ${String(status)} cannot return empty failure array`, () => {
    const proof = completeRuntimeProof();
    proof.status = status;
    assert.ok(validateStripeRuntimeEvidence(proof, { now, expectedCommitSha: sha })
      .includes('status must be Complete'));
  });
}

test('a fresh source-only proof cannot be promoted to runtime PASS', () => {
  const proof = completeRuntimeProof();
  proof.status = 'Open';
  proof.validationStatus = 'repository_contract_passed_runtime_not_run';
  proof.runtimeProof = { executed: false };
  assert.ok(validateStripeRuntimeEvidence(proof, { now, expectedCommitSha: sha })
    .includes('status must be Complete'));
});

test('an incomplete proof stays rejected even with an otherwise valid exact SHA and recent timestamp', () => {
  const proof = completeRuntimeProof();
  proof.status = 'Open';
  assert.notDeepEqual(validateStripeRuntimeEvidence(proof, { now, expectedCommitSha: sha }), []);
});

test('expired incomplete proof reports freshness and incomplete state', () => {
  const proof = completeRuntimeProof();
  proof.status = 'Open';
  proof.generatedAt = '2026-10-01T08:00:00.000Z';
  const issues = validateStripeRuntimeEvidence(proof, { now, expectedCommitSha: sha });
  assert.ok(issues.some((issue) => issue.startsWith('generatedAt is older than')));
  assert.ok(issues.includes('status must be Complete'));
});
