import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractVercelStripePriceBindings,
  requiredStripePriceKeys,
} from '../../scripts/security/load-vercel-stripe-price-bindings.mjs';

const catalog = {
  schema: 'risck-comply.billing-commercial-catalog.v1',
  plans: {
    essential: {
      monthlyPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      annualPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    },
    professional: {
      monthlyPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      annualPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    },
    business: { monthlyPriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY' },
  },
};

test('provider proof binding source is the five canonical Vercel Production price keys', () => {
  assert.deepEqual(requiredStripePriceKeys(catalog), [
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    'STRIPE_PRICE_BUSINESS_MONTHLY',
  ]);
});

test('extracts exactly one production price value per required key', () => {
  const keys = requiredStripePriceKeys(catalog);
  const rows = keys.map((key, index) => ({ key, value: `price_live${index}`, target: ['production'] }));
  assert.deepEqual(
    extractVercelStripePriceBindings(rows, keys),
    Object.fromEntries(rows.map(({ key, value }) => [key, value])),
  );
});

test('fails closed for missing, duplicate, or malformed bindings', () => {
  const keys = requiredStripePriceKeys(catalog);
  const valid = keys.map((key, index) => ({ key, value: `price_live${index}`, target: ['production'] }));
  assert.throws(() => extractVercelStripePriceBindings(valid.slice(1), keys), /vercel_price_binding_count/);
  assert.throws(() => extractVercelStripePriceBindings([...valid, { ...valid[0] }], keys), /vercel_price_binding_count/);
  const malformed = structuredClone(valid);
  malformed[0].value = 'old_account_value';
  assert.throws(() => extractVercelStripePriceBindings(malformed, keys), /vercel_price_binding_invalid/);
});
