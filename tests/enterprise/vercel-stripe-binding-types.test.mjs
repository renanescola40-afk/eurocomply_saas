import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertRuntimeVercelTargetAuthority,
  canonicalPriceKeys,
  canonicalStripeSecretKeys,
  runtimeVercelTargetFromEnv,
  validateExistingPriceBindingTypes,
  validateExistingSecretBindingTypes,
} from '../../scripts/security/check-vercel-stripe-binding-types.mjs';

const catalog = {
  plans: {
    essential: { monthlyPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL' },
    professional: { monthlyPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL' },
    business: { monthlyPriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_BUSINESS_ANNUAL' },
  },
};

const target = {
  projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
  teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
  projectName: 'eurocomply-saas',
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

test('requires existing Stripe secret bindings to remain Vercel sensitive values', () => {
  const keys = canonicalStripeSecretKeys();
  assert.deepEqual(keys, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
  assert.equal(validateExistingSecretBindingTypes([], keys), true);
  assert.equal(validateExistingSecretBindingTypes([
    { key: 'STRIPE_SECRET_KEY', type: 'sensitive', target: ['production'] },
    { key: 'STRIPE_WEBHOOK_SECRET', type: 'sensitive', target: ['production'] },
  ], keys), true);
  assert.throws(() => validateExistingSecretBindingTypes([
    { key: 'STRIPE_SECRET_KEY', type: 'encrypted', target: ['production'] },
  ], keys), /vercel_secret_binding_not_sensitive_requires_manual_recreate:STRIPE_SECRET_KEY:encrypted/);
  assert.throws(() => validateExistingSecretBindingTypes([
    { key: 'STRIPE_WEBHOOK_SECRET', type: 'plain', target: ['production'] },
  ], keys), /vercel_secret_binding_not_sensitive_requires_manual_recreate:STRIPE_WEBHOOK_SECRET:plain/);
  assert.throws(() => validateExistingSecretBindingTypes([
    { key: 'STRIPE_SECRET_KEY', type: 'sensitive', target: ['production'] },
    { key: 'STRIPE_SECRET_KEY', type: 'sensitive', target: ['production'] },
  ], keys), /vercel_env_ambiguous:STRIPE_SECRET_KEY/);
});

test('runtime Vercel target is strictly shaped and must exactly match reviewed authority', () => {
  const runtime = runtimeVercelTargetFromEnv({
    VERCEL_PROJECT_ID: target.projectId,
    VERCEL_TEAM_ID: target.teamId,
    VERCEL_PROJECT_NAME: target.projectName,
  });
  assert.deepEqual(runtime, target);
  assert.equal(assertRuntimeVercelTargetAuthority(target, runtime), true);
  assert.throws(
    () => assertRuntimeVercelTargetAuthority(target, { ...runtime, projectId: 'prj_other' }),
    /vercel_target_authority_mismatch:projectId/,
  );
  assert.throws(
    () => runtimeVercelTargetFromEnv({ ...runtime, VERCEL_PROJECT_ID: '../escape' }),
    /invalid_runtime_vercel_project_id/,
  );
});
