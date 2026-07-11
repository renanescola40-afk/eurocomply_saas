function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateStripeRuntimeEvidence(
  evidence,
  { now = new Date(), maxAgeDays = 7, expectedRepository = 'renanescola40-afk/eurocomply_saas', expectedBranch = 'main' } = {},
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
