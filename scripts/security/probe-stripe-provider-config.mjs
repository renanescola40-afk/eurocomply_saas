#!/usr/bin/env node

const required = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_GROWTH'];
for (const name of required) {
  if (!String(process.env[name] ?? '').trim()) throw new Error(`Missing required environment: ${name}`);
}

if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  throw new Error('Stripe provider proof must run with a test-mode secret key');
}

const auth = `Bearer ${process.env.STRIPE_SECRET_KEY}`;
const headers = { Authorization: auth };

async function stripe(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Stripe API request failed with status ${response.status}`);
  return response.json();
}

const [account, starter, growth, webhooks] = await Promise.all([
  stripe('/account'),
  stripe(`/prices/${encodeURIComponent(process.env.STRIPE_PRICE_STARTER)}`),
  stripe(`/prices/${encodeURIComponent(process.env.STRIPE_PRICE_GROWTH)}`),
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

const result = {
  testModeConfirmed: account.livemode === false && starter.livemode === false && growth.livemode === false,
  accountActive: account.charges_enabled === true || account.details_submitted === true,
  starterPriceActive: starter.active === true && starter.type === 'recurring',
  growthPriceActive: growth.active === true && growth.type === 'recurring',
  recurringIntervalsPresent: Boolean(starter.recurring?.interval && growth.recurring?.interval),
  enabledWebhookEndpointPresent: enabledEndpoint,
};

if (Object.values(result).some((value) => value !== true)) {
  throw new Error(`Stripe provider configuration proof failed: ${JSON.stringify(result)}`);
}

process.stdout.write(`${JSON.stringify(result)}\n`);
