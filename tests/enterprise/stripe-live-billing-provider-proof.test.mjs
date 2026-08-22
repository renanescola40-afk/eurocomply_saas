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
const defaultPortalContract = {
  schema: 'risck-comply.stripe-billing-portal-contract.v1',
  configurationId: null,
};
const explicitPortalContract = {
  schema: 'risck-comply.stripe-billing-portal-contract.v1',
  configurationId: 'bpc_reviewed',
};

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
  process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_essentialmonthly';
  process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL = 'price_essentialannual';
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professionalmonthly';
  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL = 'price_professionalannual';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnv)) process.env[key] = value;
});

function portalConfiguration({ isDefault = true, active = true } = {}) {
  return {
    id: isDefault ? 'bpc_default' : 'bpc_reviewed',
    active,
    livemode: true,
    is_default: isDefault,
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
  };
}

function installProviderMock({ defaultPortalPresent = true, explicitPortalActive = true, webhookEvents = null } = {}) {
  const prices = new Map([
    ['price_essentialmonthly', { amount: 4900, interval: 'month', plan: 'essential' }],
    ['price_essentialannual', { amount: 49000, interval: 'year', plan: 'essential' }],
    ['price_professionalmonthly', { amount: 14900, interval: 'month', plan: 'professional' }],
    ['price_professionalannual', { amount: 149000, interval: 'year', plan: 'professional' }],
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
    if (value === 'https://api.stripe.com/v1/billing_portal/configurations?active=true&limit=100') {
      return jsonResponse({ data: defaultPortalPresent ? [portalConfiguration()] : [] });
    }
    if (value.includes('/v1/billing_portal/configurations/')) {
      return jsonResponse(portalConfiguration({ isDefault: false, active: explicitPortalActive }));
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
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET',
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

test('passes with account-default Portal authority, canonical prices, six Production Billing bindings and canonical webhook', async () => {
  installProviderMock();
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    catalog,
    portalContract: defaultPortalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Complete');
  assert.equal(proof.outcome, 'passed');
  assert.equal(proof.checks.fourCanonicalSelfServeBindingsConfigured, true);
  assert.equal(proof.checks.allCanonicalSelfServePricesMatchLiveCatalog, true);
  assert.equal(proof.checks.productionBillingBindingKeysPresent, true);
  assert.equal(proof.checks.productionWebhookSigningSecretBindingPresent, true);
  assert.equal(proof.checks.billingPortalContractResolvedAndPolicyMatched, true);
  assert.equal(proof.portal.contractSource, 'default');
  assert.equal(proof.portal.defaultConfigurationConfirmed, true);
  assert.equal(proof.runtimeBindings.requiredKeyCount, 6);
  assert.deepEqual(proof.selfServePrices.map((price) => [price.publicId, price.cadence]), [
    ['essential', 'monthly'],
    ['essential', 'annual'],
    ['professional', 'monthly'],
    ['professional', 'annual'],
  ]);
  const serialized = JSON.stringify(proof);
  assert.equal(serialized.includes('price_essentialmonthly'), false);
  assert.equal(serialized.includes('sk_live_redacted'), false);
  assert.equal(serialized.includes('bpc_default'), false);
  assert.equal(serialized.includes('we_redacted'), false);
});

test('passes with an explicitly versioned Portal configuration without an environment-variable selector', async () => {
  installProviderMock();
  process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = 'bpc_wrong_env_override';
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    catalog,
    portalContract: explicitPortalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Complete');
  assert.equal(proof.portal.contractSource, 'explicit');
  assert.equal(proof.checks.billingPortalContractResolvedAndPolicyMatched, true);
  assert.equal(JSON.stringify(proof).includes('bpc_wrong_env_override'), false);
});

test('fails closed when default authority is selected but no matching live default Portal exists', async () => {
  installProviderMock({ defaultPortalPresent: false });
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    catalog,
    portalContract: defaultPortalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.portal.contractSource, 'default');
  assert.equal(proof.portal.defaultConfigurationConfirmed, false);
  assert.equal(proof.checks.billingPortalContractResolvedAndPolicyMatched, false);
});

test('fails closed when an annual canonical binding is absent even if legacy aliases exist', async () => {
  installProviderMock();
  delete process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL;
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    catalog,
    portalContract: defaultPortalContract,
    portalPolicy,
    providerTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.fourCanonicalSelfServeBindingsConfigured, false);
  assert.equal(proof.checks.transitionPolicyRejectsLegacy, true);
});

test('fails closed when the lifecycle webhook is missing a required event', async () => {
  installProviderMock({ webhookEvents: ['invoice.paid'] });
  const proof = await buildStripeLiveBillingProviderProof({
    targetSha: TARGET_SHA,
    secret: 'sk_live_redacted',
    catalog,
    portalContract: defaultPortalContract,
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
    catalog,
    portalContract: defaultPortalContract,
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
    catalog,
    portalContract: defaultPortalContract,
    portalPolicy,
    providerTargets: tamperedTargets,
  });

  assert.equal(proof.status, 'Open');
  assert.equal(proof.checks.productionBillingBindingKeysPresent, false);
  assert.equal(outbound.some((url) => url.includes('prj_untrustedRepositoryValue')), false);
  assert.equal(outbound.some((url) => {
    try {
      return new URL(url).hostname === 'api.vercel.com';
    } catch {
      return false;
    }
  }), false);
});
