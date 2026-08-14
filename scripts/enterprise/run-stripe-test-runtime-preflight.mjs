#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const MAX_RESPONSE_BYTES = 64 * 1024;
const COMMERCIAL_CATALOG_PATH = 'config/billing-commercial-catalog.json';
const WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json';
const CANONICAL_PUBLIC_PLANS = ['essential', 'professional', 'business'];

function loadJson(path, expectedSchema) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema !== expectedSchema) throw new Error(`Invalid contract schema: ${path}`);
  return value;
}

function required(name, fallback) {
  const value = String(process.env[name] ?? '').trim() || String(fallback ?? '').trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('TARGET_BASE_URL must use https');
  if (url.username || url.password || url.search || url.hash) throw new Error('TARGET_BASE_URL must not contain credentials, query or fragment');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

async function boundedJson(response) {
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('provider_response_too_large');
  return JSON.parse(text);
}

async function stripe(path, secretKey) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Stripe API request failed with status ${response.status}`);
  return boundedJson(response);
}

const commercialCatalog = loadJson(COMMERCIAL_CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
const webhookContract = loadJson(WEBHOOK_CONTRACT_PATH, 'risck-comply.stripe-webhook-contract.v1');
const releaseSha = required('RELEASE_SHA');
if (!/^[a-f0-9]{40}$/i.test(releaseSha)) throw new Error('RELEASE_SHA must be a full Git SHA');

const targetBaseUrl = normalizeBaseUrl(required('TARGET_BASE_URL'));
const targetEnvironment = required('TARGET_ENVIRONMENT', 'staging');
if (targetEnvironment !== 'staging') throw new Error('Stripe test runtime preflight is restricted to staging');

const stripeSecretKey = required('STRIPE_SECRET_KEY');
if (!stripeSecretKey.startsWith('sk_test_')) throw new Error('Stripe test runtime preflight requires an sk_test_ key');

const canonicalWebhookUrl = `${targetBaseUrl}${webhookContract.canonicalPath}`;
const requiredEvents = Array.isArray(webhookContract.requiredEvents) ? webhookContract.requiredEvents : [];
if (requiredEvents.length === 0) throw new Error('Stripe webhook contract has no required events');

const priceBindings = CANONICAL_PUBLIC_PLANS.map((publicId) => {
  const plan = commercialCatalog.plans?.[publicId];
  if (!plan || !Number.isInteger(plan.monthlyPriceCents) || typeof plan.monthlyPriceEnvKey !== 'string') {
    throw new Error(`Invalid canonical billing plan contract: ${publicId}`);
  }
  return {
    publicId,
    expectedAmountCents: plan.monthlyPriceCents,
    priceId: required(plan.monthlyPriceEnvKey),
  };
});

const [webhooks, healthResponse, ...prices] = await Promise.all([
  stripe('/webhook_endpoints?limit=100', stripeSecretKey),
  fetch(`${targetBaseUrl}/api/health`, { redirect: 'error', signal: AbortSignal.timeout(15_000) }),
  ...priceBindings.map(({ priceId }) => stripe(`/prices/${encodeURIComponent(priceId)}?expand[]=product`, stripeSecretKey)),
]);

function isCanonicalTestPrice(price, expectedAmountCents) {
  return price?.livemode === false
    && price?.active === true
    && price?.type === 'recurring'
    && price?.recurring?.interval === 'month'
    && String(price?.currency ?? '').toLowerCase() === String(commercialCatalog.currency ?? '').toLowerCase()
    && price?.unit_amount === expectedAmountCents
    && price?.product?.active === true;
}

const inspectedPrices = priceBindings.map((binding, index) => ({
  publicId: binding.publicId,
  expectedAmountCents: binding.expectedAmountCents,
  passed: isCanonicalTestPrice(prices[index], binding.expectedAmountCents),
}));

const exactWebhook = Array.isArray(webhooks?.data)
  ? webhooks.data.find((endpoint) => endpoint?.url === canonicalWebhookUrl && endpoint?.status === 'enabled' && endpoint?.livemode === false)
  : null;
const enabledEvents = new Set(exactWebhook?.enabled_events ?? []);
const requiredWebhookEventsPresent = Boolean(exactWebhook)
  && requiredEvents.every((event) => enabledEvents.has(event));
const healthCacheControl = String(healthResponse.headers.get('cache-control') ?? '').toLowerCase();

const checks = {
  testModeConfirmed: prices.every((price) => price?.livemode === false) && exactWebhook?.livemode === false,
  essentialPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'essential')?.passed === true,
  professionalPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'professional')?.passed === true,
  businessPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'business')?.passed === true,
  canonicalPriceMetadataMatches: inspectedPrices.every(({ passed }) => passed),
  exactWebhookEndpointPresent: Boolean(exactWebhook),
  requiredWebhookEventsPresent,
  targetHealthOk: healthResponse.status === 200,
  targetHealthNoStore: healthCacheControl.includes('no-store'),
};

const failedChecks = Object.entries(checks).filter(([, passed]) => passed !== true).map(([name]) => name);
const generatedAt = new Date().toISOString();
const evidence = {
  id: 'stripe-test-runtime-preflight',
  status: failedChecks.length === 0 ? 'Complete' : 'Blocked',
  validationStatus: failedChecks.length === 0 ? 'passed' : 'blocked',
  generatedAt,
  repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  commitSha: releaseSha.toLowerCase(),
  targetEnvironment,
  targetHost: new URL(targetBaseUrl).host,
  webhookPath: webhookContract.canonicalPath,
  requiredEvents,
  prices: inspectedPrices,
  checks,
  failedChecks,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    mutationPerformed: false,
    p0PromotionPerformed: false,
    stripePriceIdsStored: false,
    webhookUrlStored: false,
  },
  truthBoundary: 'This preflight proves only isolated Stripe test-mode canonical price metadata, exact webhook URL/event subscription and staging health configuration. It does not create Stripe objects, deliver an entitlement event, prove database mutation, or close billing runtime evidence.',
};

const outputPath = process.env.STRIPE_TEST_PREFLIGHT_OUTPUT || 'artifacts/stripe-test-runtime-preflight/evidence.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: evidence.status, validationStatus: evidence.validationStatus, failedChecks })}\n`);

if (failedChecks.length > 0) process.exitCode = 1;
