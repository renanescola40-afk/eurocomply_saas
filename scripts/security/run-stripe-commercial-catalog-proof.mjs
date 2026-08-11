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

function canonicalMonthlyPlans(catalog) {
  return ['essential', 'professional', 'business'].map((publicId) => {
    const plan = catalog.plans?.[publicId];
    if (!plan || typeof plan.monthlyPriceEnvKey !== 'string' || !Number.isInteger(plan.monthlyPriceCents)) {
      throw new Error(`invalid_canonical_monthly_plan_${publicId}`);
    }
    return {
      publicId,
      expectedAmountCents: plan.monthlyPriceCents,
      envKey: plan.monthlyPriceEnvKey,
      priceId: env(plan.monthlyPriceEnvKey),
    };
  });
}

async function inspectPrice(secret, plan) {
  if (!secret || !plan.priceId) {
    return {
      configured: Boolean(plan.priceId),
      reachable: false,
      active: false,
      productActive: false,
      recurringMonthly: false,
      eur: false,
      amountMatches: false,
      passed: false,
    };
  }

  const response = await request(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(plan.priceId)}?expand[]=product`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return {
      configured: true,
      reachable: false,
      active: false,
      productActive: false,
      recurringMonthly: false,
      eur: false,
      amountMatches: false,
      passed: false,
    };
  }

  const body = await jsonBounded(response);
  const result = {
    configured: true,
    reachable: Boolean(body),
    active: body?.active === true,
    productActive: body?.product?.active === true,
    recurringMonthly: body?.type === 'recurring' && body?.recurring?.interval === 'month',
    eur: String(body?.currency ?? '').toLowerCase() === 'eur',
    amountMatches: body?.unit_amount === plan.expectedAmountCents,
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

  const plans = canonicalMonthlyPlans(catalog);
  const inspected = await Promise.all(plans.map(async (plan) => ({
    publicId: plan.publicId,
    expectedAmountCents: plan.expectedAmountCents,
    priceEnvKey: plan.envKey,
    checks: await inspectPrice(secret, plan),
  })));
  const enterprise = catalog.plans?.enterprise;
  const enterprisePolicy = {
    salesLed: enterprise?.salesLed === true,
    fixedPublicStripePriceRequired: enterprise?.fixedPublicStripePriceRequired === false,
    startingMonthlyPriceCents: enterprise?.startingMonthlyPriceCents === 99000,
  };

  const checks = {
    exactProductionContext: exactContext,
    stripeSecretConfigured: Boolean(secret),
    stripeAccountReachable: accountReachable,
    threeCanonicalMonthlyPriceKeysConfigured: plans.every((plan) => Boolean(plan.priceId)),
    allCanonicalMonthlyPricesMatchCatalog: inspected.every((plan) => plan.checks.passed),
    enterpriseContractPricingPolicyValid: Object.values(enterprisePolicy).every(Boolean),
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema: 'risck-comply.stripe-commercial-catalog-proof.v1',
    evidenceItem: 'stripe-commercial-catalog-proof',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    reviewedAt: generatedAt,
    commitSha: targetSha || null,
    currency: catalog.currency,
    checks,
    plans: inspected,
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
    truthBoundary: 'This proof validates only configured canonical monthly Stripe Price metadata against the versioned commercial catalog. It does not create Prices, change subscriptions, prove tax configuration, approve Enterprise contracts or migrate existing customers.',
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
    plans: evidence.plans.map((plan) => ({ publicId: plan.publicId, expectedAmountCents: plan.expectedAmountCents, checks: plan.checks })),
  }, null, 2));
  if (evidence.outcome !== 'passed') process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
