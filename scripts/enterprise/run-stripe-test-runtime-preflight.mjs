#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

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

const releaseSha = required('RELEASE_SHA');
if (!/^[a-f0-9]{40}$/i.test(releaseSha)) throw new Error('RELEASE_SHA must be a full Git SHA');

const targetBaseUrl = normalizeBaseUrl(required('TARGET_BASE_URL'));
const targetEnvironment = required('TARGET_ENVIRONMENT', 'staging');
if (targetEnvironment !== 'staging') throw new Error('Stripe test runtime preflight is restricted to staging');

const stripeSecretKey = required('STRIPE_SECRET_KEY');
if (!stripeSecretKey.startsWith('sk_test_')) throw new Error('Stripe test runtime preflight requires an sk_test_ key');

const webhookUrl = `${targetBaseUrl}/api/stripe/webhook`;
const starterPriceId = required('STRIPE_PRICE_STARTER_MONTHLY', process.env.STRIPE_PRICE_STARTER);
const growthPriceId = required('STRIPE_PRICE_GROWTH_MONTHLY', process.env.STRIPE_PRICE_GROWTH);
const enterprisePriceId = required('STRIPE_PRICE_ENTERPRISE_MONTHLY', process.env.STRIPE_PRICE_ENTERPRISE);

const [account, starter, growth, enterprise, webhooks, healthResponse] = await Promise.all([
  stripe('/account', stripeSecretKey),
  stripe(`/prices/${encodeURIComponent(starterPriceId)}`, stripeSecretKey),
  stripe(`/prices/${encodeURIComponent(growthPriceId)}`, stripeSecretKey),
  stripe(`/prices/${encodeURIComponent(enterprisePriceId)}`, stripeSecretKey),
  stripe('/webhook_endpoints?limit=100', stripeSecretKey),
  fetch(`${targetBaseUrl}/api/health`, { redirect: 'error', signal: AbortSignal.timeout(15_000) }),
]);

function recurringTestPrice(price) {
  return price?.livemode === false && price?.active === true && price?.type === 'recurring' && Boolean(price?.recurring?.interval);
}

const exactWebhook = Array.isArray(webhooks?.data)
  ? webhooks.data.find((endpoint) => endpoint?.url === webhookUrl && endpoint?.status === 'enabled')
  : null;
const enabledEvents = new Set(exactWebhook?.enabled_events ?? []);
const webhookEventsComplete = Boolean(exactWebhook) && (enabledEvents.has('*') || REQUIRED_EVENTS.every((event) => enabledEvents.has(event)));
const healthCacheControl = String(healthResponse.headers.get('cache-control') ?? '').toLowerCase();

const checks = {
  testModeConfirmed: account?.livemode === false,
  accountActive: account?.charges_enabled === true || account?.details_submitted === true,
  starterPriceActive: recurringTestPrice(starter),
  growthPriceActive: recurringTestPrice(growth),
  enterprisePriceActive: recurringTestPrice(enterprise),
  exactWebhookEndpointPresent: Boolean(exactWebhook),
  requiredWebhookEventsPresent: webhookEventsComplete,
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
  webhookPath: '/api/stripe/webhook',
  requiredEvents: REQUIRED_EVENTS,
  checks,
  failedChecks,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    mutationPerformed: false,
    p0PromotionPerformed: false,
  },
  truthBoundary: 'This preflight proves only test-mode provider, price, exact webhook URL/event subscription and staging health configuration. It does not create Stripe objects, deliver an entitlement event, prove database mutation, or close billing runtime evidence.',
};

const outputPath = process.env.STRIPE_TEST_PREFLIGHT_OUTPUT || 'artifacts/stripe-test-runtime-preflight/evidence.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: evidence.status, validationStatus: evidence.validationStatus, failedChecks })}\n`);

if (failedChecks.length > 0) process.exitCode = 1;
