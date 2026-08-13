#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const EVIDENCE_PATH = resolve('docs/security/evidence/runtime/production-secrets-provider-stores.json');
const API_TIMEOUT_MS = 8_000;

export const CANONICAL_STRIPE_MONTHLY_CATALOG = Object.freeze([
  Object.freeze({
    plan: 'starter',
    canonicalEnv: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    legacyEnvs: Object.freeze(['STRIPE_PRICE_STARTER_MONTHLY']),
    unitAmount: 4_900,
    currency: 'eur',
    acceptedPlanMetadata: Object.freeze(['essential', 'starter']),
    required: true,
  }),
  Object.freeze({
    plan: 'professional',
    canonicalEnv: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    legacyEnvs: Object.freeze(['STRIPE_PRICE_GROWTH_MONTHLY']),
    unitAmount: 14_900,
    currency: 'eur',
    acceptedPlanMetadata: Object.freeze(['professional', 'growth']),
    required: true,
  }),
  Object.freeze({
    plan: 'business',
    canonicalEnv: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    legacyEnvs: Object.freeze([]),
    unitAmount: 39_900,
    currency: 'eur',
    acceptedPlanMetadata: Object.freeze(['business']),
    required: false,
  }),
  Object.freeze({
    plan: 'enterprise',
    canonicalEnv: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    legacyEnvs: Object.freeze(['STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY']),
    unitAmount: 99_000,
    currency: 'eur',
    acceptedPlanMetadata: Object.freeze(['enterprise']),
    required: true,
  }),
]);

function env(name) {
  return String(process.env[name] ?? '').trim();
}

export function configuredCatalogPriceId(entry) {
  const canonical = env(entry.canonicalEnv);
  if (canonical) return { priceId: canonical, source: 'canonical' };
  for (const legacyEnv of entry.legacyEnvs) {
    const legacy = env(legacyEnv);
    if (legacy) return { priceId: legacy, source: 'legacy' };
  }
  return { priceId: '', source: 'missing' };
}

function normalizedPlanMetadata(price) {
  const product = price?.product && typeof price.product === 'object' ? price.product : null;
  const values = [
    price?.metadata?.billing_plan_id,
    price?.metadata?.target_entitlement_plan,
    price?.metadata?.plan,
    product?.metadata?.billing_plan_id,
    product?.metadata?.target_entitlement_plan,
    product?.metadata?.plan,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(values)];
}

export function validateCanonicalStripePrice(entry, price) {
  const product = price?.product && typeof price.product === 'object' ? price.product : null;
  const planMetadata = normalizedPlanMetadata(price);
  const acceptedPlan = planMetadata.some((value) => entry.acceptedPlanMetadata.includes(value));

  const checks = {
    active: price?.active === true,
    recurringMonthly: price?.type === 'recurring' && price?.recurring?.interval === 'month',
    licensed: price?.recurring?.usage_type === 'licensed',
    currency: String(price?.currency ?? '').toLowerCase() === entry.currency,
    unitAmount: Number(price?.unit_amount) === entry.unitAmount,
    productActive: product?.active === true,
    planMetadata: acceptedPlan,
    liveMode: price?.livemode === true && product?.livemode === true,
  };

  return {
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}

async function requestPrice(secret, priceId) {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}?expand[]=product`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      },
    );
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function recomputeEvidence(evidence) {
  const providers = Array.isArray(evidence?.providersReviewed) ? evidence.providersReviewed : [];
  const passed = providers.length > 0 && providers.every((entry) => entry?.status === 'reviewed');
  evidence.status = passed ? 'Complete' : 'Open';
  evidence.outcome = passed ? 'passed' : 'blocked';
  evidence.controlsVerified = providers
    .filter((entry) => entry?.status === 'reviewed')
    .map((entry) => `${entry.provider} production provider configuration verified by protected runtime probe.`);
  return passed;
}

export async function enforceStripeCatalog(evidence, fetchPrice = requestPrice) {
  const secret = env('STRIPE_SECRET_KEY');
  const stripeEntry = Array.isArray(evidence?.providersReviewed)
    ? evidence.providersReviewed.find((entry) => entry?.provider === 'stripe')
    : null;

  if (!stripeEntry) throw new Error('Stripe provider evidence entry is missing');

  const configured = CANONICAL_STRIPE_MONTHLY_CATALOG.map((entry) => ({
    entry,
    ...configuredCatalogPriceId(entry),
  }));
  const required = configured.filter(({ entry }) => entry.required);
  const requiredIds = required.map(({ priceId }) => priceId).filter(Boolean);
  const requiredPriceIdsPresent = requiredIds.length === required.length;
  const requiredPriceIdsDistinct = new Set(requiredIds).size === requiredIds.length;

  let canonicalMonthlyPrices = 0;
  let optionalBusinessPriceValid = true;
  let canonicalEnvSelections = 0;

  if (secret) {
    for (const item of configured) {
      if (!item.priceId) {
        if (!item.entry.required) continue;
        continue;
      }
      if (item.source === 'canonical') canonicalEnvSelections += 1;
      const price = await fetchPrice(secret, item.priceId);
      const validation = price ? validateCanonicalStripePrice(item.entry, price) : { passed: false };
      if (validation.passed) canonicalMonthlyPrices += 1;
      if (!item.entry.required && !validation.passed) optionalBusinessPriceValid = false;
    }
  } else {
    optionalBusinessPriceValid = false;
  }

  const requiredCanonicalPricesValid = canonicalMonthlyPrices >= required.length
    && required.every(({ priceId }) => Boolean(priceId));
  const canonicalCatalogMatched = Boolean(secret)
    && requiredPriceIdsPresent
    && requiredPriceIdsDistinct
    && requiredCanonicalPricesValid
    && optionalBusinessPriceValid;

  stripeEntry.checks = {
    ...(stripeEntry.checks ?? {}),
    canonicalCatalogMatched,
    requiredPriceIdsDistinct,
    canonicalPrimaryPrecedence: required.every((item) => item.source === 'canonical' || item.source === 'legacy'),
  };
  stripeEntry.metrics = {
    ...(stripeEntry.metrics ?? {}),
    canonicalRequiredMonthlyPrices: required.length,
    canonicalMonthlyPrices,
    canonicalEnvSelections,
    optionalBusinessPriceConfigured: configured.find(({ entry }) => entry.plan === 'business')?.source !== 'missing',
  };

  if (!canonicalCatalogMatched) stripeEntry.status = 'blocked';
  return recomputeEvidence(evidence);
}

async function main() {
  const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8'));
  const passed = await enforceStripeCatalog(evidence);
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Canonical Stripe catalog proof: ${passed ? 'reviewed' : 'blocked'}`);
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Canonical Stripe catalog proof failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
    process.exit(1);
  });
}
