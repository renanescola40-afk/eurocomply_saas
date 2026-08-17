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
  process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_essential_monthly';
  process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL = 'price_essential_annual';
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professional_monthly';
  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL = 'price_professional_annual';
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

function installStripeMock({ professionalAnnualAmount = 149000 } = {}) {
  const prices = new Map([
    ['price_essential_monthly', { amount: 4900, interval: 'month' }],
    ['price_essential_annual', { amount: 49000, interval: 'year' }],
    ['price_professional_monthly', { amount: 14900, interval: 'month' }],
    ['price_professional_annual', { amount: professionalAnnualAmount, interval: 'year' }],
  ]);
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value === 'https://api.stripe.com/v1/account') return jsonResponse({ id: 'acct_redacted' });
    const priceId = decodeURIComponent(value.split('/').pop().split('?')[0]);
    const price = prices.get(priceId);
    if (!price) return jsonResponse({ error: 'not_found' }, 404);
    return jsonResponse({
      livemode: true,
      active: true,
      type: 'recurring',
      recurring: { interval: price.interval },
      currency: 'eur',
      unit_amount: price.amount,
      product: { active: true },
    });
  };
}

test('passes only when canonical Essential and Professional monthly+annual prices match the approved catalog', async () => {
  installStripeMock();
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_live_redacted' });

  assert.equal(proof.status, 'Complete');
  assert.equal(proof.outcome, 'passed');
  assert.equal(proof.checks.allCanonicalSelfServePricesMatchCatalog, true);
  assert.equal(proof.checks.fourCanonicalSelfServePriceKeysConfigured, true);
  assert.equal(proof.checks.businessSalesLedPolicyValid, true);
  assert.deepEqual(proof.prices.map((price) => [price.publicId, price.cadence, price.expectedAmountCents]), [
    ['essential', 'monthly', 4900],
    ['essential', 'annual', 49000],
    ['professional', 'monthly', 14900],
    ['professional', 'annual', 149000],
  ]);
  assert.equal(proof.enterprisePolicy.startingMonthlyPriceCents, true);
  assert.equal(proof.legacyCompatibility.allowed, false);
  assert.equal(proof.legacyCompatibility.provesCanonicalCommercialPrice, false);
  assert.equal(JSON.stringify(proof).includes('price_essential_monthly'), false);
  assert.equal(JSON.stringify(proof).includes('sk_live_redacted'), false);
});

test('does not treat legacy price env keys as canonical commercial proof or checkout authority', async () => {
  delete process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
  delete process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL;
  delete process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
  delete process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL;
  installStripeMock();

  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_live_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.fourCanonicalSelfServePriceKeysConfigured, false);
  assert.equal(proof.legacyCompatibility.allowed, false);
  assert.equal(proof.legacyCompatibility.provesCanonicalCommercialPrice, false);
});

test('fails closed when a canonical annual Stripe Price has the wrong amount', async () => {
  installStripeMock({ professionalAnnualAmount: 199000 });
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_live_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.allCanonicalSelfServePricesMatchCatalog, false);
  const professionalAnnual = proof.prices.find((price) => price.publicId === 'professional' && price.cadence === 'annual');
  assert.equal(professionalAnnual?.checks.amountMatches, false);
});

test('fails closed when a canonical self-serve Price is duplicated across cadence bindings', async () => {
  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
  installStripeMock();
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_live_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.fourCanonicalSelfServePricesDistinct, false);
});

test('fails closed outside the exact protected production context', async () => {
  installStripeMock();
  process.env.GITHUB_REF_NAME = 'feature';
  const proof = await buildStripeCommercialCatalogProof({ targetSha: TARGET_SHA, secret: 'sk_live_redacted' });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.exactProductionContext, false);
});
