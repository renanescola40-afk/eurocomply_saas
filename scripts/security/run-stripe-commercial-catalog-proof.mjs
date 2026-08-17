#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve('docs/security/evidence/runtime/stripe-commercial-catalog-proof.json');
const CATALOG_PATH = resolve('config/billing-commercial-catalog.json');
const FULL_SHA = /^[a-f0-9]{40}$/;
const API_TIMEOUT_MS = 8_000;

function env(name) {
  return String(process.env[name] ?? '').trim();
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

async function jsonBounded(response, maxBytes = 512 * 1024) {
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
        await reader.cancel('stripe_response_too_large').catch(() => undefined);
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

function loadCatalog() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  if (catalog?.schema !== 'risck-comply.billing-commercial-catalog.v1') {
    throw new Error('invalid_billing_commercial_catalog_schema');
  }
  if (catalog?.currency !== 'EUR') throw new Error('invalid_billing_commercial_catalog_currency');
  return catalog;
}

function canonicalSelfServePrices(catalog) {
  const prices = [];
  for (const publicId of ['essential', 'professional']) {
    const plan = catalog.plans?.[publicId];
    if (!plan || plan.selfServe !== true || plan.salesLed !== false) {
      throw new Error(`invalid_canonical_self_serve_plan_${publicId}`);
    }
    for (const cadence of ['monthly', 'annual']) {
      const envKey = plan[`${cadence}PriceEnvKey`];
      const amount = plan[`${cadence}PriceCents`];
      if (typeof envKey !== 'string' || !Number.isInteger(amount)) {
        throw new Error(`invalid_canonical_self_serve_price_${publicId}_${cadence}`);
      }
      prices.push({
        publicId,
        cadence,
        expectedInterval: cadence === 'monthly' ? 'month' : 'year',
        expectedAmountCents: amount,
        envKey,
        priceId: env(envKey),
      });
    }
  }
  return prices;
}

async function inspectPrice(secret, price) {
  if (!secret || !price.priceId) {
    return {
      configured: Boolean(price.priceId),
      reachable: false,
      liveMode: false,
      active: false,
      productActive: false,
      recurringCadenceMatches: false,
      eur: false,
      amountMatches: false,
      passed: false,
    };
  }

  const response = await request(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(price.priceId)}?expand[]=product`,
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
      eur: false,
      amountMatches: false,
      passed: false,
    };
  }

  const body = await jsonBounded(response);
  const result = {
    configured: true,
    reachable: Boolean(body),
    liveMode: body?.livemode === true,
    active: body?.active === true,
    productActive: body?.product?.active === true,
    recurringCadenceMatches: body?.type === 'recurring' && body?.recurring?.interval === price.expectedInterval,
    eur: String(body?.currency ?? '').toLowerCase() === 'eur',
    amountMatches: body?.unit_amount === price.expectedAmountCents,
  };
  return { ...result, passed: Object.values(result).every(Boolean) };
}

export async function buildStripeCommercialCatalogProof({
  targetSha = env('TARGET_SHA').toLowerCase(),
  catalog = loadCatalog(),
  secret = env('STRIPE_SECRET_KEY'),
} = {}) {
  const generatedAt = new Date().toISOString();
  const exactContext = FULL_SHA.test(targetSha)
    && env('GITHUB_REF_NAME') === 'main'
    && env('PROVIDER_PROOF_ENVIRONMENT') === 'production';

  let accountReachable = false;
  if (secret) {
    const account = await request('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    accountReachable = account?.status === 200;
    await account?.body?.cancel().catch(() => undefined);
  }

  const prices = canonicalSelfServePrices(catalog);
  const inspected = await Promise.all(prices.map(async (price) => ({
    publicId: price.publicId,
    cadence: price.cadence,
    expectedAmountCents: price.expectedAmountCents,
    priceEnvKey: price.envKey,
    checks: await inspectPrice(secret, price),
  })));
  const business = catalog.plans?.business;
  const enterprise = catalog.plans?.enterprise;
  const businessPolicy = {
    salesLed: business?.salesLed === true,
    selfServeDisabled: business?.selfServe === false,
  };
  const enterprisePolicy = {
    salesLed: enterprise?.salesLed === true,
    selfServeDisabled: enterprise?.selfServe === false,
    fixedPublicStripePriceRequired: enterprise?.fixedPublicStripePriceRequired === false,
    startingMonthlyPriceCents: enterprise?.startingMonthlyPriceCents === 99000,
  };

  const configuredIds = prices.map((price) => price.priceId).filter(Boolean);
  const checks = {
    exactProductionContext: exactContext,
    stripeSecretConfigured: Boolean(secret),
    stripeAccountReachable: accountReachable,
    fourCanonicalSelfServePriceKeysConfigured: prices.every((price) => Boolean(price.priceId)),
    fourCanonicalSelfServePricesDistinct: configuredIds.length === 4 && new Set(configuredIds).size === 4,
    allCanonicalSelfServePricesMatchCatalog: inspected.every((price) => price.checks.passed),
    businessSalesLedPolicyValid: Object.values(businessPolicy).every(Boolean),
    enterpriseContractPricingPolicyValid: Object.values(enterprisePolicy).every(Boolean),
    legacyStripePriceFallbackRejected: catalog.transitionPolicy?.legacyStripePriceFallbackAllowed === false,
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema: 'risck-comply.stripe-commercial-catalog-proof.v2',
    evidenceItem: 'stripe-commercial-catalog-proof',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    reviewedAt: generatedAt,
    commitSha: targetSha || null,
    currency: catalog.currency,
    checks,
    prices: inspected,
    businessPolicy,
    enterprisePolicy,
    legacyCompatibility: {
      allowed: catalog.transitionPolicy?.legacyStripePriceFallbackAllowed === true,
      provesCanonicalCommercialPrice: false,
    },
    redactionConfirmation: 'No Stripe secret, Price ID, Product ID, customer data, URLs or provider response bodies are stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      providerResponseBodiesStored: false,
      stripePriceIdsStored: false,
      stripeSecretStored: false,
      customerDataStored: false,
    },
    truthBoundary: 'This proof validates the four canonical self-serve Essential/Professional monthly and annual live Stripe Price bindings against the versioned commercial catalog. Business and Enterprise remain sales-led. It does not create Prices, change subscriptions, prove tax configuration, approve Enterprise contracts or migrate existing customers.',
  };
}

async function main() {
  const evidence = await buildStripeCommercialCatalogProof();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    commitSha: evidence.commitSha,
    checks: evidence.checks,
    prices: evidence.prices.map((price) => ({
      publicId: price.publicId,
      cadence: price.cadence,
      expectedAmountCents: price.expectedAmountCents,
      checks: price.checks,
    })),
  }, null, 2));
  if (evidence.outcome !== 'passed') process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
