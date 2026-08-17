import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { afterEach, beforeEach } from 'node:test';

import { buildStripeLiveBillingProviderProof } from '../../scripts/security/run-stripe-live-billing-provider-proof.mjs';

const TARGET_SHA = 'b'.repeat(40);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const catalog = JSON.parse(readFileSync('config/billing-commercial-catalog.json', 'utf8'));
const portalPolicy = JSON.parse(readFileSync('config/stripe-billing-portal-policy.json', 'utf8'));
const providerTargets = JSON.parse(readFileSync('config/production-provider-targets.json', 'utf8'));
const portalContract = {
  schema: 'risck-comply.stripe-billing-portal-contract.v1',
  configurationId: 'bpc_reviewed',
};
const portalConfigurationId = 'bpc_reviewed';

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.GITHUB_REF_NAME = 'main';
  process.env.PROVIDER_PROOF_ENVIRONMENT = 'production';
  process.env.VERCEL_TOKEN = 'vercel_redacted';
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

function installProviderMock({ portalActive = true, webhookEvents = null } = {}) {
  const prices = new Map([
    ['price_essential_monthly', { amount: 4900, interval: 'month', plan: 'essential' }],
    ['price_essential_annual', { amount: 49000, interval: 'year', plan: 'essential' }],
    ['price_professional_monthly', { amount: 14900, interval: 'month', plan: 'professional' }],
    ['price_professional_annual', { amount: 149000, interval: 'year', plan: 'professional' }],
  ]);
  const events = webhookEvents ?? [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.paid',
  ];

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value === 'https://api.stripe.com/v1/account') return jsonResponse({ id: 'acct_redacted' });
    if (value.includes('/v1/prices/')) {
      const priceId = decodeURIComponent(value.split('/v1/prices/')[1].split('?')[0]);
      const price = prices.get(priceId);
      if (!price) return jsonResponse({ error: 'not_found' }, 404);
      return jsonResponse({
        livemode: true,
        active: true,
        type: 'recurring',
        recurring: { interval: price.interval },
        currency: 'eur',
        unit_amount: price.amount,
        product: {
          active: true,
          metadata: {
            billing_plan_id: price.plan,
            catalog_status: 'canonical_live',
          },
        },
      });
    }
    if (value.includes('/v1/billing_portal/configurations/')) {
      return jsonResponse({
        active: portalActive,
        default_return_url: portalPolicy.defaultReturnUrl,
        metadata: portalPolicy.managementMetadata,
        features: {
          customer_update: {
            enabled: true,
            allowed_updates: ['tax_id', 'address'],
          },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: false },
          subscription_update: { enabled: false },
        },
      });
    }
    if (value === 'https://api.stripe.com/v1/webhook_endpoints?limit=100') {
      return jsonResponse({
        data: [{
          id: 'we_redacted',
          url: 'https://www.risckcomply.com/api/stripe/webhook',
          livemode: true,
          status: 'enabled',
          enabled_events: events,
        }],
      });
    }
    if (value.includes('api.vercel.com/v10/projects/') && value.includes('/env?')) {
      return jsonResponse({
        envs: [
          'STRIPE_PRICE_ESSENTIAL_MONTHLY',
          'STRIPE_PRICE_ESSENTIAL_ANNUAL',
          'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
          'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
        ].map((key) => ({ key, target: ['production'] })),
      });
    }
    return jsonResponse({ error: 'unexpected_request' }, 500);
  };
}

test('passes only with canonical monthly+annual prices, production bindings, reviewed Portal and canonical webhook', async () => {
  installProviderMock();
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Complete');
  assert.equal(proof.outcome, 'passed');
  assert.equal(proof.checks.fourCanonicalSelfServeBindingsConfigured, true);
  assert.equal(proof.checks.allCanonicalSelfServePricesMatchLiveCatalog, true);
  assert.equal(proof.checks.productionRuntimeBindingKeysPresent, true);
  assert.equal(proof.checks.billingPortalConfigurationPinnedAndPolicyMatched, true);
  assert.equal(proof.checks.canonicalLifecycleWebhookLive, true);
  assert.deepEqual(proof.selfServePrices.map((price) => [price.publicId, price.cadence]), [
    ['essential', 'monthly'],
    ['essential', 'annual'],
    ['professional', 'monthly'],
    ['professional', 'annual'],
  ]);
  const serialized = JSON.stringify(proof);
  assert.equal(serialized.includes('price_essential_monthly'), false);
  assert.equal(serialized.includes('sk_live_redacted'), false);
  assert.equal(serialized.includes('bpc_reviewed'), false);
  assert.equal(serialized.includes('we_redacted'), false);
});

test('fails closed when an annual canonical binding is absent even if legacy aliases exist', async () => {
  installProviderMock();
  delete process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL;
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.fourCanonicalSelfServeBindingsConfigured, false);
  assert.equal(proof.checks.transitionPolicyRejectsLegacy, true);
});

test('fails closed until the reviewed Billing Portal configuration is pinned', async () => {
  installProviderMock();
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract: { ...portalContract, configurationId: null },
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.portal.pinned, false);
  assert.equal(proof.checks.billingPortalConfigurationPinnedAndPolicyMatched, false);
});

test('fails closed when runtime Portal id differs from the reviewed contract without sending file data outbound', async () => {
  installProviderMock();
  const providerFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, init) => {
    outbound.push(String(url));
    return providerFetch(url, init);
  };

  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId: 'bpc_runtimeDifferent',
    catalog,
    portalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.portal.pinned, false);
  assert.equal(outbound.some((url) => url.includes('/v1/billing_portal/configurations/')), false);
});

test('fails closed when the lifecycle webhook is missing a required event', async () => {
  installProviderMock({ webhookEvents: ['invoice.paid'] });
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.canonicalLifecycleWebhookLive, false);
});

test('fails closed outside exact production context', async () => {
  installProviderMock();
  process.env.GITHUB_REF_NAME = 'feature';
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.exactProductionContext, false);
});

test('fails closed without sending repository-controlled Vercel target data outbound', async () => {
  installProviderMock();
  const providerFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, init) => {
    outbound.push(String(url));
    return providerFetch(url, init);
  };

  const tamperedTargets = {
    ...providerTargets,
    vercel: {
      ...providerTargets.vercel,
      projectId: 'prj_untrustedRepositoryValue',
    },
  };
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    portalConfigurationId,
    catalog,
    portalContract,
    portalPolicy,
    providerTargets: tamperedTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.productionRuntimeBindingKeysPresent, false);
  assert.equal(outbound.some((url) => url.includes('prj_untrustedRepositoryValue')), false);
  assert.equal(outbound.some((url) => {
    try {
      return new URL(url).hostname === 'api.vercel.com';
    } catch {
      return false;
    }
  }), false);
});
