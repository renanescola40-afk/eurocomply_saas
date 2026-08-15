#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const COMMERCIAL_CATALOG_PATH = 'config/billing-commercial-catalog.json';
const WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json';
const BILLING_PORTAL_CONTRACT_PATH = 'config/stripe-billing-portal-contract.json';
const CANONICAL_PUBLIC_PLANS = ['essential', 'professional', 'business'];
const BILLING_PORTAL_CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/;

function loadJson(path, expectedSchema) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema !== expectedSchema) throw new Error(`Invalid contract schema: ${path}`);
  return value;
}

function requiredEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

async function readBoundedJsonResponse(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error('provider_response_too_large');
  }

  if (!response.body) throw new Error('provider_response_body_missing');

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel('provider_response_too_large');
        throw new Error('provider_response_too_large');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

const commercialCatalog = loadJson(COMMERCIAL_CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
const webhookContract = loadJson(WEBHOOK_CONTRACT_PATH, 'risck-comply.stripe-webhook-contract.v1');
const portalContract = loadJson(BILLING_PORTAL_CONTRACT_PATH, 'risck-comply.stripe-billing-portal-contract.v1');
const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
const explicitPortalConfigurationId = portalContract.configurationId;

if (!/^(?:sk|rk)_live_/.test(stripeSecretKey)) {
  throw new Error('Stripe production provider proof requires a live-mode secret or restricted key');
}

if (
  explicitPortalConfigurationId !== null
  && (
    typeof explicitPortalConfigurationId !== 'string'
    || !BILLING_PORTAL_CONFIGURATION_ID_PATTERN.test(explicitPortalConfigurationId)
  )
) {
  throw new Error('Invalid Stripe Billing Portal repository contract');
}

const priceBindings = CANONICAL_PUBLIC_PLANS.map((publicId) => {
  const plan = commercialCatalog.plans?.[publicId];
  if (!plan || !Number.isInteger(plan.monthlyPriceCents) || typeof plan.monthlyPriceEnvKey !== 'string') {
    throw new Error(`Invalid canonical billing plan contract: ${publicId}`);
  }

  return {
    publicId,
    expectedAmountCents: plan.monthlyPriceCents,
    priceId: requiredEnv(plan.monthlyPriceEnvKey),
  };
});

const canonicalWebhookUrl = `${String(webhookContract.productionBaseUrl).replace(/\/$/, '')}${webhookContract.canonicalPath}`;
const requiredEvents = Array.isArray(webhookContract.requiredEvents) ? webhookContract.requiredEvents : [];
if (!canonicalWebhookUrl.startsWith('https://') || requiredEvents.length === 0) {
  throw new Error('Invalid Stripe webhook contract');
}

const headers = { Authorization: `Bearer ${stripeSecretKey}` };

async function stripe(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Stripe API request failed with status ${response.status}`);
  return readBoundedJsonResponse(response);
}

const portalConfigurationPath = explicitPortalConfigurationId
  ? `/billing_portal/configurations/${encodeURIComponent(explicitPortalConfigurationId)}`
  : '/billing_portal/configurations?active=true&is_default=true&limit=100';

const [account, webhooks, portalConfigurationResponse, ...prices] = await Promise.all([
  stripe('/account'),
  stripe('/webhook_endpoints?limit=100'),
  stripe(portalConfigurationPath),
  ...priceBindings.map(({ priceId }) => stripe(`/prices/${encodeURIComponent(priceId)}?expand[]=product`)),
]);

function isCanonicalLivePrice(price, expectedAmountCents) {
  return price?.livemode === true
    && price?.active === true
    && price?.type === 'recurring'
    && price?.recurring?.interval === 'month'
    && String(price?.currency ?? '').toLowerCase() === String(commercialCatalog.currency ?? '').toLowerCase()
    && price?.unit_amount === expectedAmountCents
    && price?.product?.active === true;
}

const inspectedPrices = priceBindings.map((binding, index) => ({
  publicId: binding.publicId,
  passed: isCanonicalLivePrice(prices[index], binding.expectedAmountCents),
}));

const exactWebhook = Array.isArray(webhooks?.data)
  ? webhooks.data.find((endpoint) => endpoint?.url === canonicalWebhookUrl && endpoint?.status === 'enabled' && endpoint?.livemode === true)
  : null;
const enabledEvents = new Set(exactWebhook?.enabled_events ?? []);
const requiredWebhookEventsPresent = Boolean(exactWebhook)
  && requiredEvents.every((event) => enabledEvents.has(event));

const portalConfiguration = explicitPortalConfigurationId
  ? portalConfigurationResponse
  : Array.isArray(portalConfigurationResponse?.data)
    ? portalConfigurationResponse.data.find((configuration) => (
        configuration?.active === true
        && configuration?.is_default === true
        && configuration?.livemode === true
      ))
    : null;

const billingPortalConfigurationPresent = Boolean(portalConfiguration)
  && portalConfiguration?.active === true
  && portalConfiguration?.livemode === true;
const billingPortalConfigurationBindingValid = billingPortalConfigurationPresent
  && (explicitPortalConfigurationId
    ? portalConfiguration?.id === explicitPortalConfigurationId
    : portalConfiguration?.is_default === true);

const result = {
  liveModeConfirmed: prices.every((price) => price?.livemode === true)
    && exactWebhook?.livemode === true
    && portalConfiguration?.livemode === true,
  accountActive: account?.charges_enabled === true || account?.details_submitted === true,
  essentialPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'essential')?.passed === true,
  professionalPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'professional')?.passed === true,
  businessPriceActive: inspectedPrices.find(({ publicId }) => publicId === 'business')?.passed === true,
  canonicalPriceMetadataMatches: inspectedPrices.every(({ passed }) => passed),
  exactWebhookEndpointPresent: Boolean(exactWebhook),
  requiredWebhookEventsPresent,
  billingPortalConfigurationPresent,
  billingPortalConfigurationBindingValid,
};

if (Object.values(result).some((value) => value !== true)) {
  throw new Error('Stripe production provider configuration proof failed');
}

process.stdout.write(`${JSON.stringify(result)}\n`);
