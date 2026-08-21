import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildFinalBillingProductLiveCloseout } from '../../scripts/security/build-final-billing-product-live-closeout.mjs';

const workflow = readFileSync('.github/workflows/final-billing-product-live-closeout.yml', 'utf8');
const controlPlaneProof = readFileSync('scripts/security/run-final-stripe-control-plane-proof.mjs', 'utf8');
const targetSha = 'a'.repeat(40);
const completeLifecycle = {
  status: 'Complete',
  outcome: 'passed',
  failures: [],
};
const successOutcomes = {
  portalBootstrap: 'success',
  stripeControlPlane: 'success',
  commercialCatalog: 'success',
  runtimeReleaseSha: 'success',
  lifecycleObservation: 'success',
  auditChain: 'success',
  lifecycleEvidence: 'success',
};

test('final closeout is manual, Production-protected and exact-SHA bounded', () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  push:/m);
  assert.doesNotMatch(workflow, /^  pull_request:/m);
  assert.doesNotMatch(workflow, /continue-on-error\s*:\s*true/i);
  assert.match(workflow, /environment: Production/);
  assert.match(workflow, /release_sha:/);
  assert.match(workflow, /CLOSE_BILLING_PRODUCT_LIVE/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /verify-runtime-release-sha\.mjs/);
});

test('final closeout composes Portal, provider, catalog and durable lifecycle proofs', () => {
  assert.match(workflow, /provision-stripe-billing-portal-config\.mjs/);
  assert.match(workflow, /run-final-stripe-control-plane-proof\.mjs/);
  assert.match(workflow, /run-stripe-commercial-catalog-proof\.mjs/);
  assert.match(workflow, /billing-lifecycle-runtime-proof\.sql/);
  assert.match(workflow, /billing-lifecycle-audit-chain\.sql/);
  assert.match(workflow, /build-billing-lifecycle-runtime-proof\.mjs/);
  assert.match(workflow, /build-final-billing-product-live-closeout\.mjs/);
  assert.match(workflow, /BILLING_PRODUCT_EU_AI_ACT: PASS/);
});

test('closeout secrets and live identifiers are step-scoped and recovery does not depend on apt networking', () => {
  const jobEnvStart = workflow.indexOf('    env:\n');
  const stepsStart = workflow.indexOf('    steps:\n', jobEnvStart);
  assert.notEqual(jobEnvStart, -1);
  assert.notEqual(stepsStart, -1);
  const jobEnv = workflow.slice(jobEnvStart, stepsStart);
  assert.doesNotMatch(jobEnv, /secrets\./);
  assert.doesNotMatch(jobEnv, /organization_id|stripe_subscription_id|stripe_event_id/i);
  assert.doesNotMatch(workflow, /apt-get\s+(?:update|install)/);
  assert.match(workflow, /command -v psql/);
});

test('closeout workflow never creates commercial lifecycle objects for evidence', () => {
  const forbiddenCommercialMutations = [
    /customers\.create/i,
    /checkout\.sessions\.create/i,
    /subscriptions\.create/i,
    /invoices\.create/i,
    /paymentIntents\.create/i,
    /charges\.create/i,
    /\/v1\/(?:customers|checkout\/sessions|subscriptions|invoices|payment_intents|charges)(?:\b|\/)/i,
  ];
  for (const pattern of forbiddenCommercialMutations) {
    assert.doesNotMatch(workflow, pattern);
    assert.doesNotMatch(controlPlaneProof, pattern);
  }
  assert.match(workflow, /default_transaction_read_only=on/);
});

test('production control-plane proof requires exact canonical Vercel price bindings and lifecycle webhook', () => {
  assert.match(controlPlaneProof, /STRIPE_WEBHOOK_SECRET/);
  assert.match(controlPlaneProof, /(?:^|[\s'"`])https:\/\/www\.risckcomply\.com\/api\/stripe\/webhook(?:$|[\s'"`])/);
  for (const event of [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.paid',
  ]) {
    assert.equal(controlPlaneProof.includes(`'${event}'`), true);
  }
  for (const priceBinding of [
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  ]) {
    assert.equal(controlPlaneProof.includes(`'${priceBinding}'`), true);
  }
  assert.match(controlPlaneProof, /canonicalPriceValueReadCount/);
  assert.match(controlPlaneProof, /canonicalPriceValueMatchCount/);
  assert.match(controlPlaneProof, /productionCanonicalStripePriceBindingsMatch/);
  assert.match(controlPlaneProof, /vercelNonSensitivePriceValuesComparedInMemory/);
  assert.match(controlPlaneProof, /vercelSensitiveValuesRetrieved/);
  assert.match(controlPlaneProof, /vercelValuesStored:\s*false/);
  assert.match(controlPlaneProof, /v1\/projects\/\$\{CANONICAL_VERCEL_TARGET\.projectId\}\/env\/\$\{encodeURIComponent\(envId\)\}/);
  assert.match(controlPlaneProof, /detail\.decrypted !== true/);
  assert.doesNotMatch(controlPlaneProof, /v10\/projects\/\$\{CANONICAL_VERCEL_TARGET\.projectId\}\/env\?[^`]*decrypt=true/);
  assert.doesNotMatch(controlPlaneProof, /readCanonicalVercelPriceValue\(token,\s*productionRows\(entries,\s*'STRIPE_(?:SECRET_KEY|WEBHOOK_SECRET)'/);
  assert.doesNotMatch(controlPlaneProof, /console\.log\([^\n]*\.value/);
});

test('default Portal authority remains fail-closed to one live default policy match', () => {
  assert.match(controlPlaneProof, /configuration\?\.is_default === true/);
  assert.match(controlPlaneProof, /defaults\.length === 1/);
  assert.match(controlPlaneProof, /requireManagementMetadata: true/);
});

test('explicit Portal contract IDs are compared in memory and never shape provider request URLs', () => {
  assert.match(controlPlaneProof, /billing_portal\/configurations\?active=true&limit=100/);
  assert.match(controlPlaneProof, /active\.find\(\(candidate\) => candidate\?\.id === explicitId\)/);
  assert.doesNotMatch(controlPlaneProof, /billing_portal\/configurations\/\$\{/);
});

test('final decision passes only when every component and durable lifecycle evidence pass', () => {
  const evidence = buildFinalBillingProductLiveCloseout({
    targetSha,
    componentOutcomes: successOutcomes,
    lifecycleEvidence: completeLifecycle,
  });
  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.decision, 'BILLING_PRODUCT_EU_AI_ACT: PASS');
  assert.deepEqual(evidence.blockerCodes, []);
});

test('final decision stays Open without a legitimate durable lifecycle observation', () => {
  const evidence = buildFinalBillingProductLiveCloseout({
    targetSha,
    componentOutcomes: { ...successOutcomes, lifecycleObservation: 'failure', lifecycleEvidence: 'skipped' },
    lifecycleEvidence: null,
  });
  assert.equal(evidence.status, 'Open');
  assert.equal(evidence.outcome, 'blocked');
  assert.equal(evidence.decision, 'BILLING_PRODUCT_EU_AI_ACT: OPEN');
  assert.equal(evidence.checks.legitimateLifecycleObservedReadOnly, false);
  assert.equal(evidence.checks.durableLifecycleEvidenceBuilt, false);
});

test('retained final evidence contains no customer, subscription or event identifiers', () => {
  const evidence = buildFinalBillingProductLiveCloseout({
    targetSha,
    componentOutcomes: successOutcomes,
    lifecycleEvidence: completeLifecycle,
  });
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /sub_[A-Za-z0-9]+/);
  assert.doesNotMatch(serialized, /evt_[A-Za-z0-9]+/);
  assert.doesNotMatch(serialized, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});
