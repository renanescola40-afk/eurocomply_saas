function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

const PROMOTED_SOURCE_WORKFLOW = '.github/workflows/stripe-entitlement-runtime-proof.yml';

export function validateStripeRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha,
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'stripe-billing-validation') failures.push('evidenceItem must be stripe-billing-validation');

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt ?? evidence?.timestamp);
  if (generatedAt === null) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - generatedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeMs) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status !== 'Complete') return failures;

  if (!['passed', 'Pass', 'PASS'].includes(evidence?.validationStatus ?? evidence?.outcome)) {
    failures.push('Complete evidence validationStatus must be passed');
  }
  if (evidence?.repository !== expectedRepository) failures.push(`repository must be ${expectedRepository}`);
  if (evidence?.branch !== expectedBranch) failures.push(`branch must be ${expectedBranch}`);
  if (!/^[a-f0-9]{40}$/i.test(String(evidence?.commitSha ?? ''))) failures.push('commitSha must be a full commit SHA');
  if (expectedCommitSha && String(evidence?.commitSha).toLowerCase() !== String(expectedCommitSha).toLowerCase()) {
    failures.push('commitSha must match expected commit SHA');
  }

  if (evidence?.id === 'stripe-entitlement-runtime-proof') {
    for (const [path, value] of [
      ['runtimeProof.executed', evidence?.runtimeProof?.executed],
      ['runtimeProof.stripeTestModeConfirmed', evidence?.runtimeProof?.stripeTestModeConfirmed],
      ['runtimeProof.signedWebhookDelivered', evidence?.runtimeProof?.signedWebhookDelivered],
      ['runtimeProof.entitlementSnapshotObserved', evidence?.runtimeProof?.entitlementSnapshotObserved],
      ['runtimeProof.canonicalSeatPolicyObserved', evidence?.runtimeProof?.canonicalSeatPolicyObserved],
      ['runtimeProof.reconciliationLedgerObserved', evidence?.runtimeProof?.reconciliationLedgerObserved],
      ['runtimeProof.replaySafetyObserved', evidence?.runtimeProof?.replaySafetyObserved],
    ]) {
      if (value !== true) failures.push(`${path} must be true`);
    }

    const sourceRunId = String(evidence?.runtimeProof?.sourceRunId ?? '');
    if (!/^\d+$/.test(sourceRunId)) failures.push('runtimeProof.sourceRunId must be numeric');
    if (evidence?.runtimeProof?.sourceWorkflow !== PROMOTED_SOURCE_WORKFLOW) {
      failures.push(`runtimeProof.sourceWorkflow must be ${PROMOTED_SOURCE_WORKFLOW}`);
    }
    const expectedArtifactName = `stripe-entitlement-runtime-proof-${String(evidence?.commitSha ?? '')}`;
    if (evidence?.runtimeProof?.sourceArtifactName !== expectedArtifactName) {
      failures.push('runtimeProof.sourceArtifactName must match the exact commit SHA');
    }

    if (!/^[a-f0-9]{64}$/i.test(String(evidence?.sourceEvidenceDigest ?? ''))) failures.push('sourceEvidenceDigest must be SHA-256');
    if (!/^[a-f0-9]{64}$/i.test(String(evidence?.sourceReplayDigest ?? ''))) failures.push('sourceReplayDigest must be SHA-256');
    if (!/^[a-f0-9]{64}$/i.test(String(evidence?.artifactDigest ?? ''))) failures.push('artifactDigest must be SHA-256');
    if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
    if (evidence?.evidenceIntegrity?.runtimeProofInvented !== false) failures.push('evidenceIntegrity.runtimeProofInvented must be false');
    if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
    return failures;
  }

  if (evidence?.runtimeProof?.headSha !== evidence?.commitSha) failures.push('runtimeProof.headSha must match commitSha');
  if (!String(evidence?.runtimeProof?.runId ?? '').trim()) failures.push('runtimeProof.runId is required');
  if (!String(evidence?.runtimeProof?.artifactDigest ?? '').startsWith('sha256:')) failures.push('runtimeProof.artifactDigest must be a sha256 digest');

  for (const [path, value] of [
    ['checkout.tested', evidence?.checkout?.tested],
    ['portal.tested', evidence?.portal?.tested],
    ['webhookSignature.validSignatureRequiredBeforeDispatch', evidence?.webhookSignature?.validSignatureRequiredBeforeDispatch],
    ['webhookIdempotency.duplicateDoesNotMutateSubscriptionState', evidence?.webhookIdempotency?.duplicateDoesNotMutateSubscriptionState],
    ['subscriptionSync.customerMismatchRejected', evidence?.subscriptionSync?.customerMismatchRejected],
  ]) {
    if (value !== true) failures.push(`${path} must be true`);
  }

  return failures;
}
