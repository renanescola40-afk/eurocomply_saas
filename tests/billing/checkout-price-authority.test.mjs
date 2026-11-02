import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCheckoutPriceAuthority } from '../../src/server/billing/checkout-price-authority.ts';

const contract = { priceId: 'price_pro_monthly', expectedAmountCents: 14900, expectedMode: 'test' };
const canonical = {
  id: contract.priceId,
  livemode: false,
  active: true,
  type: 'recurring',
  currency: 'eur',
  unit_amount: 14900,
  billing_scheme: 'per_unit',
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
  product: { id: 'prod_professional', active: true },
};

test('accepts only an active exact-catalog subscription price', () => {
  assert.deepEqual(validateCheckoutPriceAuthority(canonical, contract), { ok: true, reason: 'canonical_price_confirmed' });
});

test('rejects the observed active €0 TEST Professional price', () => {
  const result = validateCheckoutPriceAuthority({ ...canonical, unit_amount: 0 }, contract);
  assert.deepEqual(result, { ok: false, reason: 'price_mismatch' });
});

test('rejects wrong price ID, subscription type, interval, usage, quantity-based tier pricing and currency', () => {
  for (const change of [
    { id: 'price_wrong' },
    { type: 'one_time' },
    { recurring: { ...canonical.recurring, interval: 'year' } },
    { recurring: { ...canonical.recurring, interval_count: 2 } },
    { recurring: { ...canonical.recurring, usage_type: 'metered' } },
    { billing_scheme: 'tiered' },
    { currency: 'usd' },
    { unit_amount: 4900 },
    { active: false },
    { product: { id: 'prod_professional', active: false } },
    { product: 'prod_professional' },
    { product: { deleted: true } },
  ]) {
    assert.equal(validateCheckoutPriceAuthority({ ...canonical, ...change }, contract).ok, false, JSON.stringify(change));
  }
});

test('accepts a canonical annual Price only with the correct interval and amount', () => {
  const annual = {
    ...canonical,
    unit_amount: 149000,
    recurring: { ...canonical.recurring, interval: 'year' },
  };
  const annualContract = { ...contract, expectedAmountCents: 149000, expectedInterval: 'year' };
  assert.deepEqual(validateCheckoutPriceAuthority(annual, annualContract), { ok: true, reason: 'canonical_price_confirmed' });
  assert.equal(validateCheckoutPriceAuthority(annual, { ...annualContract, expectedInterval: 'month' }).ok, false);
  assert.equal(validateCheckoutPriceAuthority(annual, { ...annualContract, expectedAmountCents: 14900 }).ok, false);
});

test('fails closed on mode mismatch, absent secret mode or invalid catalog price', () => {
  assert.equal(validateCheckoutPriceAuthority({ ...canonical, livemode: true }, contract).ok, false);
  assert.deepEqual(validateCheckoutPriceAuthority(canonical, { ...contract, expectedMode: null }), { ok: false, reason: 'mode_unavailable' });
  assert.deepEqual(validateCheckoutPriceAuthority(canonical, { ...contract, expectedAmountCents: 0 }), { ok: false, reason: 'invalid_catalog_amount' });
  assert.equal(validateCheckoutPriceAuthority(canonical, { ...contract, expectedAmountCents: null }).ok, false);
  assert.equal(validateCheckoutPriceAuthority(canonical, { ...contract, expectedAmountCents: NaN }).ok, false);
});
