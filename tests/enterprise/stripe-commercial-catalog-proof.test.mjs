import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import { buildStripeCommercialCatalogProof } from '../../scripts/security/run-stripe-commercial-catalog-proof.mjs';

const TARGET_SHA = 'a'.repeat(40);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.GITHUB_REF_NAME = 'main';
  process.env.PROVIDER_PROOF_ENVIRONMENT = 'production';
  process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_essential';
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professional';
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = 'price_business';
  process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_legacy_starter';
  process.env.STRIPE_PRICE_GROWTH_MONTHLY = 'price_legacy_growth';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnv)) process.env[key] = value;
});

function installStripeMock({ professionalAmount = 14900 } = {}) {
  const amounts = new Map([
    ['price_essential', 4900],
    ['price_professional', professionalAmount],
    ['price_business', 39900],
  ]);
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value === 'https://api.stripe.com/v1/account') return jsonResponse({ id: 'acct_redacted' });
    const priceId = decodeURIComponent(value.split('/').pop().split('?')[0]);
    if (!amounts.has(priceId)) return jsonResponse({ error: 'not_found' }, 404);
    return jsonResponse({
      active: true,
      type: 'recurring',
      recurring: { interval: 'month' },
      currency: 'eur',
      unit_amount: amounts.get(priceId),
      product: { active: true },
    });
  };
}

test('passes only when canonical Essential Professional and Business prices match the approved catalog', async () => {
  installStripeMock();
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_test_redacted' });

  assert.equal(proof.status, 'Complete');
  assert.equal(proof.outcome, 'passed');
  assert.equal(proof.checks.allCanonicalMonthlyPricesMatchCatalog, true);
  assert.deepEqual(proof.plans.map((plan) => [plan.publicId, plan.expectedAmountCents]), [
    ['essential', 4900],
    ['professional', 14900],
    ['business', 39900],
  ]);
  assert.equal(proof.enterprisePolicy.startingMonthlyPriceCents, true);
  assert.equal(proof.legacyCompatibility.allowed, false);
  assert.equal(proof.legacyCompatibility.provesCanonicalCommercialPrice, false);
  assert.equal(JSON.stringify(proof).includes('price_essential'), false);
  assert.equal(JSON.stringify(proof).includes('sk_test_redacted'), false);
});

test('does not treat legacy price env keys as canonical commercial proof or checkout authority', async () => {
  delete process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
  delete process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
  delete process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  installStripeMock();

  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_test_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.threeCanonicalMonthlyPriceKeysConfigured, false);
  assert.equal(proof.legacyCompatibility.allowed, false);
  assert.equal(proof.legacyCompatibility.provesCanonicalCommercialPrice, false);
});

test('fails closed when a canonical Stripe Price has the old amount', async () => {
  installStripeMock({ professionalAmount: 19900 });
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_test_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.allCanonicalMonthlyPricesMatchCatalog, false);
  const professional = proof.plans.find((plan) => plan.publicId === 'professional');
  assert.equal(professional?.checks.amountMatches, false);
});

test('fails closed outside the exact protected production context', async () => {
  installStripeMock();
  process.env.GITHUB_REF_NAME = 'feature';
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_test_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.exactProductionContext, false);
});
