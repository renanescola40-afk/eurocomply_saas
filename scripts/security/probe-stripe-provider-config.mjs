#!/usr/bin/env node

function requiredEnv(name, fallbackName) {
  const value = String(process.env[name] ?? '').trim() || String(process.env[fallbackName] ?? '').trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
if (!stripeSecretKey) throw new Error('Missing required environment: STRIPE_SECRET_KEY');

const starterPriceId = requiredEnv('STRIPE_PRICE_STARTER_MONTHLY', 'STRIPE_PRICE_STARTER');
const growthPriceId = requiredEnv('STRIPE_PRICE_GROWTH_MONTHLY', 'STRIPE_PRICE_GROWTH');
const enterprisePriceId = requiredEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_ENTERPRISE');

if (!stripeSecretKey.startsWith('sk_test_')) {
  throw new Error('Stripe provider proof must run with a test-mode secret key');
}

const headers = { Authorization: `Bearer ${stripeSecretKey}` };

async function stripe(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Stripe API request failed with status ${response.status}`);
  return response.json();
}

const [account, starter, growth, enterprise, webhooks] = await Promise.all([
  stripe('/account'),
  stripe(`/prices/${encodeURIComponent(starterPriceId)}`),
  stripe(`/prices/${encodeURIComponent(growthPriceId)}`),
  stripe(`/prices/${encodeURIComponent(enterprisePriceId)}`),
  stripe('/webhook_endpoints?limit=100'),
]);

const requiredEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

const enabledEndpoint = Array.isArray(webhooks.data) && webhooks.data.some((endpoint) => {
  if (endpoint.status !== 'enabled' || !endpoint.url?.startsWith('https://')) return false;
  const events = new Set(endpoint.enabled_events ?? []);
  return events.has('*') || [...requiredEvents].every((event) => events.has(event));
});

function isActiveRecurringTestPrice(price) {
  return price.livemode === false
    && price.active === true
    && price.type === 'recurring'
    && Boolean(price.recurring?.interval);
}

const result = {
  testModeConfirmed: account.livemode === false
    && starter.livemode === false
    && growth.livemode === false
    && enterprise.livemode === false,
  accountActive: account.charges_enabled === true || account.details_submitted === true,
  starterPriceActive: isActiveRecurringTestPrice(starter),
  growthPriceActive: isActiveRecurringTestPrice(growth),
  enterprisePriceActive: isActiveRecurringTestPrice(enterprise),
  recurringIntervalsPresent: Boolean(starter.recurring?.interval && growth.recurring?.interval && enterprise.recurring?.interval),
  enabledWebhookEndpointPresent: enabledEndpoint,
};

if (Object.values(result).some((value) => value !== true)) {
  throw new Error('Stripe provider configuration proof failed');
}

process.stdout.write(`${JSON.stringify(result)}\n`);
