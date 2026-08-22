import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertRuntimeVercelTargetAuthority,
  extractVercelStripePriceBindings,
  loadVercelStripePriceBindings,
  requiredStripePriceKeys,
  runtimeVercelTargetFromEnv,
} from '../../scripts/security/load-vercel-stripe-price-bindings.mjs';

const loaderSource = readFileSync('scripts/security/load-vercel-stripe-price-bindings.mjs', 'utf8');

const catalog = {
  schema: 'risck-comply.billing-commercial-catalog.v1',
  transitionPolicy: { legacyStripePriceFallbackAllowed: false },
  plans: {
    essential: {
      selfServe: true,
      salesLed: false,
      monthlyPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      annualPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    },
    professional: {
      selfServe: true,
      salesLed: false,
      monthlyPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      annualPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    },
    business: { selfServe: false, salesLed: true, monthlyPriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY' },
  },
};

const target = {
  projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
  teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
  projectName: 'eurocomply-saas',
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('provider proof binding source is exactly the four canonical self-serve Vercel Production price keys', () => {
  assert.deepEqual(requiredStripePriceKeys(catalog), [
    'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  ]);
});

test('rejects catalogs that re-enable legacy fallback or corrupt self-serve policy', () => {
  assert.throws(
    () => requiredStripePriceKeys({ ...catalog, transitionPolicy: { legacyStripePriceFallbackAllowed: true } }),
    /legacy_stripe_price_fallback_must_be_disabled/,
  );
  const invalidPolicy = structuredClone(catalog);
  invalidPolicy.plans.professional.salesLed = true;
  assert.throws(() => requiredStripePriceKeys(invalidPolicy), /invalid_self_serve_policy:professional/);
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

test('falls back to the official per-env decrypted endpoint when the project env listing masks a new Price value', async () => {
  const keys = requiredStripePriceKeys(catalog);
  const rows = keys.map((key, index) => ({
    id: `env_${index}`,
    key,
    value: 'Encrypted',
    type: 'encrypted',
    target: ['production'],
  }));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v10/projects/')) return jsonResponse({ envs: rows });
    const match = String(url).match(/\/env\/env_(\d+)\?/);
    assert.ok(match, `unexpected fallback URL: ${url}`);
    const index = Number(match[1]);
    return jsonResponse({
      id: `env_${index}`,
      key: keys[index],
      value: `price_live${index}`,
      decrypted: true,
      type: 'encrypted',
    });
  };

  const bindings = await loadVercelStripePriceBindings({
    fetchImpl,
    token: 'vercel_test_token',
    target,
    catalog,
  });

  assert.deepEqual(bindings, Object.fromEntries(keys.map((key, index) => [key, `price_live${index}`])));
  assert.equal(calls.length, 5);
  assert.match(calls[0], /\/v10\/projects\/prj_APpXAyQFy1Gie50xfbO45zjkyUSm\/env\?/);
  assert.ok(calls.slice(1).every((url) => url.includes('/v1/projects/prj_APpXAyQFy1Gie50xfbO45zjkyUSm/env/env_')));
});

test('per-env fallback remains fail closed for missing ids, key mismatches, and malformed decrypted values', async () => {
  const keys = requiredStripePriceKeys(catalog);
  const baseRows = keys.map((key, index) => ({
    id: `env_${index}`,
    key,
    value: index === 0 ? 'Encrypted' : `price_live${index}`,
    target: ['production'],
  }));

  const missingId = structuredClone(baseRows);
  delete missingId[0].id;
  await assert.rejects(
    loadVercelStripePriceBindings({
      token: 'vercel_test_token',
      target,
      catalog,
      fetchImpl: async () => jsonResponse({ envs: missingId }),
    }),
    /vercel_price_binding_unreadable:STRIPE_PRICE_ESSENTIAL_MONTHLY/,
  );

  await assert.rejects(
    loadVercelStripePriceBindings({
      token: 'vercel_test_token',
      target,
      catalog,
      fetchImpl: async (url) => (
        String(url).includes('/v10/projects/')
          ? jsonResponse({ envs: baseRows })
          : jsonResponse({ key: 'WRONG_KEY', value: 'price_live0', decrypted: true })
      ),
    }),
    /vercel_env_key_mismatch:STRIPE_PRICE_ESSENTIAL_MONTHLY/,
  );

  await assert.rejects(
    loadVercelStripePriceBindings({
      token: 'vercel_test_token',
      target,
      catalog,
      fetchImpl: async (url) => (
        String(url).includes('/v10/projects/')
          ? jsonResponse({ envs: baseRows })
          : jsonResponse({ key: keys[0], value: 'not-a-price-id', decrypted: true })
      ),
    }),
    /vercel_price_binding_invalid:STRIPE_PRICE_ESSENTIAL_MONTHLY/,
  );
});

test('does not synthesize Starter, Growth, Enterprise or Business readiness aliases into GitHub env', () => {
  for (const legacyKey of [
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_GROWTH_MONTHLY',
    'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    'STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY',
  ]) {
    assert.equal(loaderSource.includes(`${legacyKey}: bindings.`), false);
    assert.equal(loaderSource.includes(`lines.push(\`${legacyKey}=`), false);
  }
  assert.equal(loaderSource.includes("const business = catalog.plans?.business"), false);
});

test('network target comes from strict runtime values and remains bound to reviewed authority', () => {
  const runtime = runtimeVercelTargetFromEnv({
    VERCEL_PROJECT_ID: target.projectId,
    VERCEL_TEAM_ID: target.teamId,
    VERCEL_PROJECT_NAME: target.projectName,
  });
  assert.deepEqual(runtime, target);
  assert.equal(assertRuntimeVercelTargetAuthority(target, runtime), true);
  assert.throws(
    () => assertRuntimeVercelTargetAuthority(target, { ...runtime, teamId: 'team_other' }),
    /vercel_target_authority_mismatch:teamId/,
  );
});
