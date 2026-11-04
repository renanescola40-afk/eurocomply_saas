// BIL-02 standalone structural acceptance guard. It validates consistency of a
// provider-backed evidence *record*, not the truth of provider assertions. A
// separately qualified reviewer must corroborate Stripe/QA/CI readbacks.
const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const STRIPE_EVENT = /^evt_[a-zA-Z0-9]{8,}$/;
const STRIPE_ENDPOINT = /^we_[a-zA-Z0-9]{8,}$/;
const DEPLOYMENT = /^dpl_[a-zA-Z0-9]+$/;
const ACCOUNT = /^acct_[a-zA-Z0-9]{8,}$/;
const REQUIRED_CI = ['signatureValid', 'signatureInvalid', 'duplicateDelivery', 'durableEventLedger'];
const ALLOWED_EVENTS = new Set([
  'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
  'customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted',
]);

const hasDigest = value => DIGEST.test(String(value ?? ''));
const hasDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now();
const okResponse = status => Number.isInteger(status) && status >= 200 && status < 300;
const rejectedResponse = status => Number.isInteger(status) && status >= 400 && status < 500;

export function verifyBIL02Evidence(proof, frozenBaselineSha) {
  const failures = [];
  const fail = detail => failures.push(detail);
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return ['BIL-02 evidence is not an object'];
  if (proof.schema !== 'risck-comply.g1-bil02-signed-test-webhook.v1' || proof.subject !== 'BIL-02' || proof.gateId !== 'A-10')
    fail('BIL-02 schema/subject/gate mismatch');
  if (!FULL_SHA.test(String(frozenBaselineSha ?? '')) || proof.sourceBaselineSha !== frozenBaselineSha)
    fail('BIL-02 source baseline mismatch');
  if (!hasDate(proof.observedAt)) fail('BIL-02 observation time invalid');

  const releaseSha = proof.release?.gitSha;
  if (!FULL_SHA.test(String(releaseSha ?? ''))) fail('BIL-02 release source SHA missing');
  const stripe = proof.stripe ?? {};
  if (!ACCOUNT.test(String(stripe.accountId ?? '')) || stripe.mode !== 'TEST' || stripe.livemode !== false ||
      !STRIPE_EVENT.test(String(stripe.eventId ?? '')) || !ALLOWED_EVENTS.has(stripe.eventType) ||
      stripe.readFromStripeApi !== true || !hasDigest(stripe.providerEventReadbackSha256) ||
      !hasDate(stripe.providerEventObservedAt)) {
    fail('BIL-02 authenticated Stripe TEST event evidence incomplete');
  }
  const qa = proof.qaDeployment ?? {};
  if (qa.environment !== 'qa' || qa.vercelProjectId !== 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm' ||
      !DEPLOYMENT.test(String(qa.deploymentId ?? '')) || qa.readyState !== 'READY' ||
      qa.gitSha !== releaseSha || qa.supabaseProjectRef !== 'zrxrrfbllsxtleyxjpsz' ||
      qa.sourceAttested !== true || !hasDigest(qa.deploymentReadbackSha256)) {
    fail('BIL-02 isolated exact-SHA QA deployment evidence missing');
  }
  const endpoint = proof.webhookEndpoint ?? {};
  if (!STRIPE_ENDPOINT.test(String(endpoint.id ?? '')) || endpoint.enabled !== true ||
      endpoint.mode !== 'TEST' || endpoint.qaDeploymentId !== qa.deploymentId ||
      endpoint.destinationVerified !== true || endpoint.destinationEnv !== 'qa' ||
      !hasDigest(endpoint.providerEndpointReadbackSha256)) {
    fail('BIL-02 correctly routed enabled TEST webhook endpoint missing');
  }
  const delivery = proof.deliveries ?? {};
  const first = delivery.validSignature ?? {};
  if (first.eventId !== stripe.eventId || first.signatureVerified !== true ||
      !okResponse(first.httpStatus) || !hasDigest(first.appTraceSha256) ||
      !hasDigest(first.providerDeliveryReadbackSha256) ||
      first.signatureHeaderRedacted !== true || !String(first.providerAttemptRef ?? '').trim()) {
    fail('BIL-02 genuine signed delivery is not proven');
  }
  const negative = delivery.invalidSignature ?? {};
  if (negative.eventId !== stripe.eventId || !rejectedResponse(negative.httpStatus) ||
      negative.signatureRejected !== true || negative.persistentEventCreated !== false ||
      !hasDigest(negative.negativeTestTraceSha256) || negative.signatureHeaderRedacted !== true) {
    fail('BIL-02 invalid signature fail-closed test missing');
  }
  const replay = delivery.duplicateReplay ?? {};
  if (replay.eventId !== stripe.eventId || !okResponse(replay.httpStatus) ||
      replay.recognizedAsDuplicate !== true || !hasDigest(replay.appTraceSha256) ||
      !String(replay.providerAttemptRef ?? '').trim() || replay.providerAttemptRef === first.providerAttemptRef) {
    fail('BIL-02 distinct duplicate-delivery idempotency test missing');
  }
  const db = proof.durableDatabase ?? {};
  if (db.projectRef !== 'zrxrrfbllsxtleyxjpsz' || db.eventId !== stripe.eventId ||
      db.eventRows !== 1 || db.processedEventRows !== 1 || db.duplicateSideEffects !== 0 ||
      !hasDigest(db.readonlyQuerySha256) || !hasDigest(db.providerReadbackSha256) ||
      db.productionDataRead !== false || db.productionWritten !== false) {
    fail('BIL-02 idempotent durable QA event readback missing');
  }
  const ci = proof.ci ?? {};
  if (ci.gitSha !== releaseSha || ci.conclusion !== 'success' ||
      !['circleci', 'github-actions'].includes(ci.provider) ||
      !Number.isSafeInteger(ci.runId) || ci.runId <= 0 ||
      !hasDigest(ci.runArtifactSha256)) {
    fail('BIL-02 source-exact CI proof missing');
  }
  for (const check of REQUIRED_CI) {
    if (ci.tests?.[check]?.result !== 'PASS' || ci.tests?.[check]?.gitSha !== releaseSha ||
        !hasDigest(ci.tests?.[check]?.logSha256)) {
      fail('BIL-02 source-exact CI test missing: ' + check);
    }
  }
  const review = proof.independentReview ?? {};
  if (review.gitSha !== releaseSha || review.approved !== true || review.qualified !== true ||
      !Number.isSafeInteger(review.githubReviewId) || review.githubReviewId <= 0 ||
      !String(review.reviewerLogin ?? '').trim() ||
      !String(review.sourcePrAuthorLogin ?? '').trim() ||
      String(review.reviewerLogin ?? '').trim().toLowerCase() === String(review.sourcePrAuthorLogin ?? '').trim().toLowerCase() ||
      !Number.isSafeInteger(review.sourcePrNumber) || review.sourcePrNumber <= 0 ||
      !hasDate(review.approvedAt) || !hasDigest(review.reviewReadbackSha256)) {
    fail('BIL-02 qualified independent GitHub review not attested');
  }
  if (proof.secretValuesIncluded !== false || proof.productionWrites !== false ||
      proof.stripeLiveWrites !== false || proof.qaTenantIsolationVerified !== true) {
    fail('BIL-02 secret/production/tenant security boundary incomplete');
  }
  return failures;
}
