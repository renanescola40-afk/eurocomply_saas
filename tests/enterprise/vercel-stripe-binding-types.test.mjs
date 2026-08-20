import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalPriceKeys,
  validateExistingPriceBindingTypes,
} from '../../scripts/security/check-vercel-stripe-binding-types.mjs';

const catalog = {
  plans: {
    essential: { monthlyPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL' },
    professional: { monthlyPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL' },
    business: { monthlyPriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_BUSINESS_ANNUAL' },
  },
};

test('checks all canonical monthly and annual Stripe Price bindings', () => {
  assert.deepEqual(canonicalPriceKeys(catalog), [
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    'STRIPE_PRICE_BUSINESS_MONTHLY',
    'STRIPE_PRICE_BUSINESS_ANNUAL',
  ]);
});

test('allows absent or normal encrypted Price bindings and rejects duplicates', () => {
  const keys = canonicalPriceKeys(catalog);
  assert.equal(validateExistingPriceBindingTypes([], keys), true);
  assert.equal(validateExistingPriceBindingTypes([
    { key: keys[0], type: 'encrypted', target: ['production'] },
  ], keys), true);
  assert.throws(() => validateExistingPriceBindingTypes([
    { key: keys[0], type: 'encrypted', target: ['production'] },
    { key: keys[0], type: 'encrypted', target: ['production'] },
  ], keys), /vercel_env_ambiguous/);
});

test('rejects a sensitive Price ID binding because provider proof must re-read its value', () => {
  const keys = canonicalPriceKeys(catalog);
  assert.throws(() => validateExistingPriceBindingTypes([
    { key: keys[0], type: 'sensitive', target: ['production'] },
  ], keys), /vercel_price_binding_sensitive_type_requires_manual_recreate/);
});
