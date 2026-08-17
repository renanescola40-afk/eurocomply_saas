#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve('docs/security/evidence/runtime/stripe-live-billing-provider-proof.json');
const CATALOG_PATH = resolve('config/billing-commercial-catalog.json');
const PORTAL_CONTRACT_PATH = resolve('config/stripe-billing-portal-contract.json');
const PORTAL_POLICY_PATH = resolve('config/stripe-billing-portal-policy.json');
const PROVIDER_TARGETS_PATH = resolve('config/production-provider-targets.json');
const FULL_SHA = /^[a-f0-9]{40}$/;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const PORTAL_CONFIGURATION_ID = /^bpc_[A-Za-z0-9]+$/;
const API_TIMEOUT_MS = 8_000;
const CANONICAL_WEBHOOK_URL = 'https://www.risckcomply.com/api/stripe/webhook';
const CANONICAL_VERCEL_TARGET = Object.freeze({
  teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
  projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
  projectName: 'eurocomply-saas',
});
const REQUIRED_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
];
const CANONICAL_SELF_SERVE_ENV_KEYS = [
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function loadJson(path, schema) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema !== schema) throw new Error(`invalid_schema:${schema}`);
  return value;
}

function loadCatalog() {
  return loadJson(CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
}

function loadPortalContract() {
  return loadJson(PORTAL_CONTRACT_PATH, 'risck-comply.stripe-billing-portal-contract.v1');
}

function loadPortalPolicy() {
  return loadJson(PORTAL_POLICY_PATH, 'risck-comply.stripe-billing-portal-policy.v1');
}

function loadProviderTargets() {
  return loadJson(PROVIDER_TARGETS_PATH, 'risck-comply.production-provider-targets.v1');
}

async function request(url, init = {}) {
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function jsonBounded(response, maxBytes = 1024 * 1024) {
  if (!response?.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('provider_response_too_large').catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function selfServeBindings(catalog) {
  const bindings = [];
  for (const publicId of ['essential', 'professional']) {
    const plan = catalog.plans?.[publicId];
    if (!plan || plan.selfServe !== true || plan.salesLed !== false) {
      throw new Error(`invalid_self_serve_policy:${publicId}`);
    }
    for (const cadence of ['monthly', 'annual']) {
      const envKey = plan[`${cadence}PriceEnvKey`];
      const amount = plan[`${cadence}PriceCents`];
      if (typeof envKey !== 'string' || !Number.isInteger(amount)) {
        throw new Error(`invalid_self_serve_binding:${publicId}:${cadence}`);
      }
      bindings.push({
        publicId,
        cadence,
        interval: cadence === 'monthly' ? 'month' : 'year',
        expectedAmountCents: amount,
        envKey,
        priceId: env(envKey),
      });
    }
  }
  return bindings;
}

async function inspectPrice(secret, binding) {
  const configured = PRICE_ID.test(binding.priceId);
  if (!secret || !configured) {
    return {
      configured,
      reachable: false,
      liveMode: false,
      active: false,
      productActive: false,
      recurringCadenceMatches: false,
      currencyMatches: false,
      amountMatches: false,
      canonicalProductMetadata: false,
      passed: false,
    };
  }

  const response = await request(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(binding.priceId)}?expand[]=product`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return {
      configured: true,
      reachable: false,
      liveMode: false,
      active: false,
      productActive: false,
      recurringCadenceMatches: false,
      currencyMatches: false,
      amountMatches: false,
      canonicalProductMetadata: false,
      passed: false,
    };
  }

  const body = await jsonBounded(response);
  const checks = {
    configured: true,
    reachable: Boolean(body),
    liveMode: body?.livemode === true,
    active: body?.active === true,
    productActive: body?.product?.active === true,
    recurringCadenceMatches: body?.type === 'recurring' && body?.recurring?.interval === binding.interval,
    currencyMatches: String(body?.currency ?? '').toLowerCase() === 'eur',
    amountMatches: body?.unit_amount === binding.expectedAmountCents,
    canonicalProductMetadata: body?.product?.metadata?.billing_plan_id === binding.publicId
      && body?.product?.metadata?.catalog_status === 'canonical_live',
  };
  return { ...checks, passed: Object.values(checks).every(Boolean) };
}

async function inspectStripeAccount(secret) {
  if (!secret) return false;
  const response = await request('https://api.stripe.com/v1/account', {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const reachable = response?.status === 200;
  await response?.body?.cancel().catch(() => undefined);
  return reachable;
}

function sameStringSet(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const a = [...actual].map(String).sort();
  const b = [...expected].map(String).sort();
  return a.every((value, index) => value === b[index]);
}

async function inspectPortal(secret, contract, policy, runtimeConfigurationId) {
  const reviewedConfigurationId = String(contract?.configurationId ?? '').trim();
  const configurationId = String(runtimeConfigurationId ?? '').trim();
  const pinned = PORTAL_CONFIGURATION_ID.test(reviewedConfigurationId)
    && PORTAL_CONFIGURATION_ID.test(configurationId)
    && configurationId === reviewedConfigurationId;
  if (!secret || !pinned) {
    return {
      pinned,
      reachable: false,
      active: false,
      returnUrlMatches: false,
      managementMetadataMatches: false,
      customerUpdateMatches: false,
      invoiceHistoryMatches: false,
      paymentMethodUpdateMatches: false,
      subscriptionCancelDisabled: false,
      subscriptionUpdateDisabled: false,
      passed: false,
    };
  }

  const response = await request(
    `https://api.stripe.com/v1/billing_portal/configurations/${encodeURIComponent(configurationId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return {
      pinned: true,
      reachable: false,
      active: false,
      returnUrlMatches: false,
      managementMetadataMatches: false,
      customerUpdateMatches: false,
      invoiceHistoryMatches: false,
      paymentMethodUpdateMatches: false,
      subscriptionCancelDisabled: false,
      subscriptionUpdateDisabled: false,
      passed: false,
    };
  }

  const body = await jsonBounded(response);
  const features = body?.features ?? {};
  const checks = {
    pinned: true,
    reachable: Boolean(body),
    active: body?.active === true,
    returnUrlMatches: body?.default_return_url === policy.defaultReturnUrl,
    managementMetadataMatches: Object.entries(policy.managementMetadata ?? {})
      .every(([key, value]) => body?.metadata?.[key] === value),
    customerUpdateMatches: features?.customer_update?.enabled === policy.features.customerUpdate.enabled
      && sameStringSet(features?.customer_update?.allowed_updates, policy.features.customerUpdate.allowedUpdates),
    invoiceHistoryMatches: features?.invoice_history?.enabled === policy.features.invoiceHistory.enabled,
    paymentMethodUpdateMatches: features?.payment_method_update?.enabled === policy.features.paymentMethodUpdate.enabled,
    subscriptionCancelDisabled: features?.subscription_cancel?.enabled === false
      && policy.features.subscriptionCancel.enabled === false,
    subscriptionUpdateDisabled: features?.subscription_update?.enabled === false
      && policy.features.subscriptionUpdate.enabled === false,
  };
  return { ...checks, passed: Object.values(checks).every(Boolean) };
}

async function inspectWebhook(secret) {
  if (!secret) return { matchingEndpointCount: 0, passed: false };
  const response = await request('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return { matchingEndpointCount: 0, passed: false };
  }
  const body = await jsonBounded(response);
  const endpoints = Array.isArray(body?.data) ? body.data : [];
  const matching = endpoints.filter((endpoint) => endpoint?.url === CANONICAL_WEBHOOK_URL);
  const endpoint = matching.length === 1 ? matching[0] : null;
  const events = new Set(Array.isArray(endpoint?.enabled_events) ? endpoint.enabled_events : []);
  const checks = {
    singularCanonicalEndpoint: matching.length === 1,
    liveMode: endpoint?.livemode === true,
    enabled: endpoint?.status === 'enabled',
    requiredEventsConfigured: REQUIRED_WEBHOOK_EVENTS.every((event) => events.has(event)),
  };
  return {
    matchingEndpointCount: matching.length,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

async function inspectVercelBindingPresence(targets) {
  const token = env('VERCEL_TOKEN');
  const target = targets?.vercel;
  const validTarget = String(target?.teamId ?? '') === CANONICAL_VERCEL_TARGET.teamId
    && String(target?.projectId ?? '') === CANONICAL_VERCEL_TARGET.projectId
    && String(target?.projectName ?? '') === CANONICAL_VERCEL_TARGET.projectName;
  if (!token || !validTarget) {
    return {
      tokenConfigured: Boolean(token),
      targetBound: validTarget,
      productionEnvironmentEnumerated: false,
      canonicalSelfServeBindingKeysPresent: false,
      requiredKeyCount: CANONICAL_SELF_SERVE_ENV_KEYS.length,
      presentKeyCount: 0,
      passed: false,
    };
  }

  // The versioned target file is verified above, but file data is never copied into the outbound request.
  const response = await request(
    `https://api.vercel.com/v10/projects/${CANONICAL_VERCEL_TARGET.projectId}/env?target=production&decrypt=false&teamId=${CANONICAL_VERCEL_TARGET.teamId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return {
      tokenConfigured: true,
      targetBound: true,
      productionEnvironmentEnumerated: false,
      canonicalSelfServeBindingKeysPresent: false,
      requiredKeyCount: CANONICAL_SELF_SERVE_ENV_KEYS.length,
      presentKeyCount: 0,
      passed: false,
    };
  }

  const body = await jsonBounded(response);
  const entries = Array.isArray(body?.envs) ? body.envs : [];
  const keys = new Set(entries
    .filter((entry) => Array.isArray(entry?.target) ? entry.target.includes('production') : true)
    .map((entry) => String(entry?.key ?? ''))
    .filter(Boolean));
  const presentKeyCount = CANONICAL_SELF_SERVE_ENV_KEYS.filter((key) => keys.has(key)).length;
  const checks = {
    tokenConfigured: true,
    targetBound: true,
    productionEnvironmentEnumerated: true,
    canonicalSelfServeBindingKeysPresent: presentKeyCount === CANONICAL_SELF_SERVE_ENV_KEYS.length,
  };
  return {
    ...checks,
    requiredKeyCount: CANONICAL_SELF_SERVE_ENV_KEYS.length,
    presentKeyCount,
    passed: Object.values(checks).every(Boolean),
  };
}

export async function buildStripeLiveBillingProviderProof({
  targetSha = env('TARGET_SHA').toLowerCase(),
  secret = env('STRIPE_SECRET_KEY'),
  portalConfigurationId = env('STRIPE_BILLING_PORTAL_CONFIGURATION_ID'),
  catalog = loadCatalog(),
  portalContract = loadPortalContract(),
  portalPolicy = loadPortalPolicy(),
  providerTargets = loadProviderTargets(),
} = {}) {
  const generatedAt = new Date().toISOString();
  const exactProductionContext = FULL_SHA.test(targetSha)
    && env('GITHUB_REF_NAME') === 'main'
    && env('PROVIDER_PROOF_ENVIRONMENT') === 'production';
  const transitionPolicyRejectsLegacy = catalog.transitionPolicy?.legacyStripePriceFallbackAllowed === false;
  const businessSalesLed = catalog.plans?.business?.selfServe === false
    && catalog.plans?.business?.salesLed === true;
  const enterpriseSalesLed = catalog.plans?.enterprise?.selfServe === false
    && catalog.plans?.enterprise?.salesLed === true
    && catalog.plans?.enterprise?.fixedPublicStripePriceRequired === false;

  const bindings = selfServeBindings(catalog);
  const configuredPriceIds = bindings.map((binding) => binding.priceId).filter((value) => PRICE_ID.test(value));
  const fourCanonicalBindingsConfigured = configuredPriceIds.length === bindings.length;
  const fourCanonicalBindingsDistinct = new Set(configuredPriceIds).size === bindings.length;

  const [accountReachable, inspectedPrices, portal, webhook, vercelBindings] = await Promise.all([
    inspectStripeAccount(secret),
    Promise.all(bindings.map(async (binding) => ({
      publicId: binding.publicId,
      cadence: binding.cadence,
      expectedAmountCents: binding.expectedAmountCents,
      checks: await inspectPrice(secret, binding),
    }))),
    inspectPortal(secret, portalContract, portalPolicy, portalConfigurationId),
    inspectWebhook(secret),
    inspectVercelBindingPresence(providerTargets),
  ]);

  const checks = {
    exactProductionContext,
    stripeSecretConfigured: Boolean(secret),
    stripeAccountReachable: accountReachable,
    transitionPolicyRejectsLegacy,
    businessSalesLed,
    enterpriseSalesLed,
    fourCanonicalSelfServeBindingsConfigured: fourCanonicalBindingsConfigured,
    fourCanonicalSelfServeBindingsDistinct: fourCanonicalBindingsDistinct,
    allCanonicalSelfServePricesMatchLiveCatalog: inspectedPrices.every((entry) => entry.checks.passed),
    productionRuntimeBindingKeysPresent: vercelBindings.passed,
    billingPortalConfigurationPinnedAndPolicyMatched: portal.passed,
    canonicalLifecycleWebhookLive: webhook.passed,
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema: 'risck-comply.stripe-live-billing-provider-proof.v1',
    evidenceItem: 'stripe-live-billing-provider-proof',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    reviewedAt: generatedAt,
    commitSha: targetSha || null,
    checks,
    selfServePrices: inspectedPrices,
    runtimeBindings: {
      requiredKeyCount: vercelBindings.requiredKeyCount,
      presentKeyCount: vercelBindings.presentKeyCount,
      productionEnvironmentEnumerated: vercelBindings.productionEnvironmentEnumerated,
    },
    portal: {
      pinned: portal.pinned,
      reachable: portal.reachable,
      active: portal.active,
      policyMatched: portal.passed,
    },
    webhook: {
      matchingEndpointCount: webhook.matchingEndpointCount,
      passed: webhook.passed,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      providerResponseBodiesStored: false,
      requestUrlsStored: false,
      stripePriceIdsStored: false,
      stripeSecretStored: false,
      portalConfigurationIdStored: false,
      webhookEndpointIdStored: false,
      customerDataStored: false,
      decryptedVercelValuesStored: false,
    },
    truthBoundary: 'This proof is read-only. It validates exact-SHA production control-plane bindings, four canonical Essential/Professional live Stripe Prices, the pinned reviewed Billing Portal configuration and the canonical lifecycle webhook. It does not create customers, Checkout Sessions, subscriptions, invoices or charges, and it does not substitute for a legitimate live billing lifecycle acceptance run.',
  };
}

async function main() {
  const evidence = await buildStripeLiveBillingProviderProof();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    commitSha: evidence.commitSha,
    checks: evidence.checks,
    runtimeBindings: evidence.runtimeBindings,
    portal: evidence.portal,
    webhook: evidence.webhook,
  }, null, 2));
  if (evidence.outcome !== 'passed') process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
