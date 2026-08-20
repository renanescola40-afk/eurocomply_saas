import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildCanonicalStripePlan,
  inspectCanonicalWebhook,
} from '../../scripts/ops/provision-stripe-live-account.mjs';

const catalog = {
  schema: 'risck-comply.billing-commercial-catalog.v1',
  currency: 'EUR',
  plans: {
    essential: {
      name: 'Essential', selfServe: true, salesLed: false,
      monthlyPriceCents: 4900, annualPriceCents: 49000,
      monthlyPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    },
    professional: {
      name: 'Professional', selfServe: true, salesLed: false,
      monthlyPriceCents: 14900, annualPriceCents: 149000,
      monthlyPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    },
    business: {
      name: 'Business', selfServe: false, salesLed: true,
      monthlyPriceCents: 39900, annualPriceCents: 399000,
      monthlyPriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY', annualPriceEnvKey: 'STRIPE_PRICE_BUSINESS_ANNUAL',
    },
  },
};

test('canonical plan preserves reviewed EUR ladder and sales-led Business', () => {
  const plans = buildCanonicalStripePlan(catalog);
  assert.deepEqual(plans.map(({ publicId }) => publicId), ['essential', 'professional', 'business']);
  assert.deepEqual(plans[0].prices.map(({ amount, interval }) => [amount, interval]), [[4900, 'month'], [49000, 'year']]);
  assert.deepEqual(plans[1].prices.map(({ amount, interval }) => [amount, interval]), [[14900, 'month'], [149000, 'year']]);
  assert.deepEqual(plans[2].prices.map(({ amount, interval }) => [amount, interval]), [[39900, 'month'], [399000, 'year']]);
  assert.equal(plans[2].selfServe, false);
  assert.equal(plans[2].salesLed, true);
});

test('Business cannot silently become self-serve', () => {
  const invalid = structuredClone(catalog);
  invalid.plans.business.selfServe = true;
  assert.throws(() => buildCanonicalStripePlan(invalid), /business_must_remain_sales_led/);
});

test('canonical webhook requires singular live enabled endpoint with exact events', () => {
  const events = ['checkout.session.completed', 'invoice.paid'];
  const endpoint = {
    id: 'we_live123',
    url: 'https://www.risckcomply.com/api/stripe/webhook',
    livemode: true,
    status: 'enabled',
    enabled_events: events,
  };
  const result = inspectCanonicalWebhook([endpoint], endpoint.url, events);
  assert.equal(result.endpoint.id, 'we_live123');
  assert.equal(result.exactEvents, true);
  assert.throws(
    () => inspectCanonicalWebhook([endpoint, { ...endpoint, id: 'we_live456' }], endpoint.url, events),
    /canonical_webhook_ambiguous/,
  );
});

test('bootstrap contains explicit no-commerce and fail-closed provider guards', () => {
  const source = readFileSync(new URL('../../scripts/ops/provision-stripe-live-account.mjs', import.meta.url), 'utf8');
  for (const forbidden of ['/customers', '/checkout/sessions', '/subscriptions', '/invoices', '/payment_intents', '/charges']) {
    assert.equal(source.includes(`stripe('${forbidden}`), false, `must not create ${forbidden}`);
  }
  assert.match(source, /stripe_account_id_mismatch/);
  assert.match(source, /stripe_account_charges_not_enabled/);
  assert.match(source, /canonical_webhook_missing_manual_creation_required/);
  assert.match(source, /canonical_webhook_secret_required/);
});
