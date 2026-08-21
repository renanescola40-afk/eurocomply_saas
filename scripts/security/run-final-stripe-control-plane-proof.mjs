#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  loadStripeBillingPortalPolicy,
  stripeBillingPortalConfigurationMatchesPolicy,
} from './stripe-billing-portal-policy.mjs';

const OUTPUT = resolve('release-validation/final-stripe-control-plane-proof.json');
const PORTAL_CONTRACT_PATH = resolve('config/stripe-billing-portal-contract.json');
const FULL_SHA = /^[a-f0-9]{40}$/;
const PORTAL_ID = /^bpc_[A-Za-z0-9]+$/;
const STRIPE_PRICE_ID = /^price_[A-Za-z0-9]+$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const API_TIMEOUT_MS = 10_000;
const CANONICAL_WEBHOOK_URL = 'https://www.risckcomply.com/api/stripe/webhook';
const CANONICAL_VERCEL_TARGET = Object.freeze({
  teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
  projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
  projectName: 'eurocomply-saas',
});
const REQUIRED_WEBHOOK_EVENTS = Object.freeze([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);
const REQUIRED_CANONICAL_PRICE_BINDINGS = Object.freeze([
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
]);
const REQUIRED_PRODUCTION_BINDINGS = Object.freeze([
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  ...REQUIRED_CANONICAL_PRICE_BINDINGS,
]);

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function loadPortalContract() {
  const value = JSON.parse(readFileSync(PORTAL_CONTRACT_PATH, 'utf8'));
  if (value?.schema !== 'risck-comply.stripe-billing-portal-contract.v1') {
    throw new Error('invalid_stripe_billing_portal_contract');
  }
  if (value.configurationId !== null && !PORTAL_ID.test(String(value.configurationId ?? ''))) {
    throw new Error('invalid_stripe_billing_portal_configuration_id');
  }
  return value;
}

async function readBoundedJson(response) {
  if (!response?.body) return null;
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
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

async function requestJson(url, { headers = {} } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  return readBoundedJson(response);
}

function sameSet(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const left = [...actual].map(String).sort();
  const right = [...expected].map(String).sort();
  return left.every((value, index) => value === right[index]);
}

function portalMatches(configuration, policy, { requireDefault }) {
  if (!configuration || configuration.active !== true || configuration.livemode !== true) return false;
  if (requireDefault && configuration.is_default !== true) return false;
  if (!stripeBillingPortalConfigurationMatchesPolicy(configuration, policy, { requireManagementMetadata: true })) {
    return false;
  }
  const features = configuration.features ?? {};
  return configuration.default_return_url === policy.defaultReturnUrl
    && features.customer_update?.enabled === policy.features.customerUpdate.enabled
    && sameSet(features.customer_update?.allowed_updates, policy.features.customerUpdate.allowedUpdates)
    && features.invoice_history?.enabled === policy.features.invoiceHistory.enabled
    && features.payment_method_update?.enabled === policy.features.paymentMethodUpdate.enabled
    && features.subscription_cancel?.enabled === false
    && policy.features.subscriptionCancel.enabled === false
    && features.subscription_update?.enabled === false
    && policy.features.subscriptionUpdate.enabled === false;
}

async function inspectPortal(secret, contract, policy) {
  const headers = { Authorization: `Bearer ${secret}` };
  const explicitId = contract.configurationId;
  const list = await requestJson(
    'https://api.stripe.com/v1/billing_portal/configurations?active=true&limit=100',
    { headers },
  );
  const active = Array.isArray(list?.data) ? list.data : [];

  if (typeof explicitId === 'string') {
    const configuration = active.find((candidate) => candidate?.id === explicitId) ?? null;
    const passed = Boolean(configuration)
      && configuration.id === explicitId
      && portalMatches(configuration, policy, { requireDefault: false });
    return {
      contractSource: 'explicit',
      configurationCount: configuration ? 1 : 0,
      defaultConfigurationConfirmed: configuration?.is_default === true,
      policyMatched: passed,
      passed,
    };
  }

  const defaults = active.filter((configuration) => (
    configuration?.active === true
    && configuration?.livemode === true
    && configuration?.is_default === true
    && portalMatches(configuration, policy, { requireDefault: true })
  ));
  const passed = defaults.length === 1;
  return {
    contractSource: 'default',
    configurationCount: active.length,
    defaultConfigurationConfirmed: passed,
    policyMatched: passed,
    passed,
  };
}

async function inspectWebhook(secret) {
  const body = await requestJson('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const endpoints = Array.isArray(body?.data) ? body.data : [];
  const matching = endpoints.filter((endpoint) => endpoint?.url === CANONICAL_WEBHOOK_URL);
  const endpoint = matching.length === 1 ? matching[0] : null;
  const enabledEvents = new Set(Array.isArray(endpoint?.enabled_events) ? endpoint.enabled_events : []);
  const passed = Boolean(endpoint)
    && endpoint.livemode === true
    && endpoint.status === 'enabled'
    && REQUIRED_WEBHOOK_EVENTS.every((event) => enabledEvents.has(event));
  return { matchingEndpointCount: matching.length, passed };
}

function productionRows(entries, key) {
  return entries.filter((entry) => (
    String(entry?.key ?? '') === key
    && Array.isArray(entry?.target)
    && entry.target.includes('production')
  ));
}

async function readCanonicalVercelPriceValue(token, row, expectedKey) {
  const envId = String(row?.id ?? '').trim();
  if (!envId || String(row?.key ?? '') !== expectedKey) return null;

  const detail = await requestJson(
    `https://api.vercel.com/v1/projects/${CANONICAL_VERCEL_TARGET.projectId}/env/${encodeURIComponent(envId)}?teamId=${CANONICAL_VERCEL_TARGET.teamId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (
    !detail
    || detail.decrypted !== true
    || String(detail.key ?? '') !== expectedKey
    || typeof detail.value !== 'string'
  ) return null;

  return detail.value.trim();
}

async function inspectRuntimeBindings() {
  const token = env('VERCEL_TOKEN');
  if (!token) {
    return {
      productionEnvironmentEnumerated: false,
      requiredKeyCount: REQUIRED_PRODUCTION_BINDINGS.length,
      presentKeyCount: 0,
      uniqueKeyCount: 0,
      webhookSigningSecretBindingPresent: false,
      expectedCanonicalPriceCount: REQUIRED_CANONICAL_PRICE_BINDINGS.length,
      canonicalPriceValueReadCount: 0,
      canonicalPriceValueMatchCount: 0,
      canonicalPriceBindingsMatch: false,
      valuesComparedInMemory: false,
      sensitiveValuesRetrieved: false,
      passed: false,
    };
  }

  // Enumerate metadata without decrypting values. Only the four non-secret
  // canonical Stripe Price bindings are then fetched individually by env ID.
  // Stripe API/webhook secrets are never requested in decrypted form.
  const body = await requestJson(
    `https://api.vercel.com/v10/projects/${CANONICAL_VERCEL_TARGET.projectId}/env?teamId=${CANONICAL_VERCEL_TARGET.teamId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const entries = Array.isArray(body?.envs) ? body.envs : [];
  const productionEnvironmentEnumerated = Boolean(body);
  const presentKeyCount = REQUIRED_PRODUCTION_BINDINGS.filter((key) => productionRows(entries, key).length > 0).length;
  const uniqueKeyCount = REQUIRED_PRODUCTION_BINDINGS.filter((key) => productionRows(entries, key).length === 1).length;
  const webhookSigningSecretBindingPresent = productionRows(entries, 'STRIPE_WEBHOOK_SECRET').length === 1;
  const expectedCanonicalPriceValuesConfigured = REQUIRED_CANONICAL_PRICE_BINDINGS.every((key) => STRIPE_PRICE_ID.test(env(key)));

  let canonicalPriceValueReadCount = 0;
  let canonicalPriceValueMatchCount = 0;
  if (productionEnvironmentEnumerated && expectedCanonicalPriceValuesConfigured) {
    const comparisons = await Promise.all(REQUIRED_CANONICAL_PRICE_BINDINGS.map(async (key) => {
      const rows = productionRows(entries, key);
      if (rows.length !== 1) return { read: false, match: false };
      const value = await readCanonicalVercelPriceValue(token, rows[0], key);
      if (value === null) return { read: false, match: false };
      return { read: true, match: value === env(key) };
    }));
    canonicalPriceValueReadCount = comparisons.filter((comparison) => comparison.read).length;
    canonicalPriceValueMatchCount = comparisons.filter((comparison) => comparison.match).length;
  }

  const canonicalPriceBindingsMatch = canonicalPriceValueMatchCount === REQUIRED_CANONICAL_PRICE_BINDINGS.length;
  const valuesComparedInMemory = canonicalPriceValueReadCount === REQUIRED_CANONICAL_PRICE_BINDINGS.length;
  const sensitiveValuesRetrieved = false;
  const passed = productionEnvironmentEnumerated
    && presentKeyCount === REQUIRED_PRODUCTION_BINDINGS.length
    && uniqueKeyCount === REQUIRED_PRODUCTION_BINDINGS.length
    && webhookSigningSecretBindingPresent
    && canonicalPriceBindingsMatch;

  return {
    productionEnvironmentEnumerated,
    requiredKeyCount: REQUIRED_PRODUCTION_BINDINGS.length,
    presentKeyCount,
    uniqueKeyCount,
    webhookSigningSecretBindingPresent,
    expectedCanonicalPriceCount: REQUIRED_CANONICAL_PRICE_BINDINGS.length,
    canonicalPriceValueReadCount,
    canonicalPriceValueMatchCount,
    canonicalPriceBindingsMatch,
    valuesComparedInMemory,
    sensitiveValuesRetrieved,
    passed,
  };
}

export async function buildFinalStripeControlPlaneProof({
  targetSha = env('TARGET_SHA').toLowerCase(),
  stripeSecretKey = env('STRIPE_SECRET_KEY'),
  portalContract = loadPortalContract(),
  portalPolicy = loadStripeBillingPortalPolicy(),
} = {}) {
  const generatedAt = new Date().toISOString();
  const exactProductionContext = FULL_SHA.test(targetSha)
    && env('GITHUB_REF_NAME') === 'main'
    && env('PROVIDER_PROOF_ENVIRONMENT') === 'production';
  const liveStripeSecretConfigured = /^(?:sk|rk)_live_/.test(stripeSecretKey);

  let stripeAccountReachable = false;
  let portal = { contractSource: 'invalid', configurationCount: 0, defaultConfigurationConfirmed: false, policyMatched: false, passed: false };
  let webhook = { matchingEndpointCount: 0, passed: false };
  if (liveStripeSecretConfigured) {
    const account = await requestJson('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    stripeAccountReachable = Boolean(account);
    [portal, webhook] = await Promise.all([
      inspectPortal(stripeSecretKey, portalContract, portalPolicy),
      inspectWebhook(stripeSecretKey),
    ]);
  }
  const runtimeBindings = await inspectRuntimeBindings();

  const checks = {
    exactProductionContext,
    liveStripeSecretConfigured,
    stripeAccountReachable,
    billingPortalContractResolved: portal.passed,
    canonicalLifecycleWebhookLive: webhook.passed,
    productionBillingBindingsPresent: runtimeBindings.presentKeyCount === runtimeBindings.requiredKeyCount,
    productionBillingBindingsUnique: runtimeBindings.uniqueKeyCount === runtimeBindings.requiredKeyCount,
    productionCanonicalStripePriceBindingsMatch: runtimeBindings.canonicalPriceBindingsMatch,
    productionWebhookSigningSecretBindingPresent: runtimeBindings.webhookSigningSecretBindingPresent,
  };
  const passed = Object.values(checks).every(Boolean) && runtimeBindings.passed;

  return {
    schema: 'risck-comply.final-stripe-control-plane-proof.v1',
    evidenceItem: 'final-stripe-control-plane-proof',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    commitSha: targetSha || null,
    checks,
    portal: {
      contractSource: portal.contractSource,
      configurationCount: portal.configurationCount,
      defaultConfigurationConfirmed: portal.defaultConfigurationConfirmed,
      policyMatched: portal.policyMatched,
    },
    webhook: {
      matchingEndpointCount: webhook.matchingEndpointCount,
      passed: webhook.passed,
    },
    runtimeBindings,
    evidenceIntegrity: {
      providerResponseBodiesStored: false,
      providerIdsStored: false,
      stripeSecretsStored: false,
      webhookSigningSecretStored: false,
      vercelNonSensitivePriceValuesComparedInMemory: runtimeBindings.valuesComparedInMemory,
      vercelSensitiveValuesRetrieved: runtimeBindings.sensitiveValuesRetrieved,
      vercelValuesStored: false,
      customerDataStored: false,
    },
    truthBoundary: 'This read-only proof validates the exact production context, the reviewed/default Billing Portal policy, the singular canonical live webhook, unique required Vercel Production billing keys, and exact in-memory equality of the four non-secret canonical Stripe Price bindings. Vercel metadata is enumerated without decryption, only those four Price bindings are fetched decrypted by env ID, and Stripe API/webhook secret values are never requested from Vercel. No Vercel values are retained. The proof never creates customers, Checkout Sessions, subscriptions, invoices, payment intents or charges. A legitimate signed live lifecycle observation remains required for final billing acceptance.',
  };
}

async function main() {
  const evidence = await buildFinalStripeControlPlaneProof();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ status: evidence.status, outcome: evidence.outcome, checks: evidence.checks }, null, 2));
  if (evidence.outcome !== 'passed') process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
