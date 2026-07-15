import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { isBillableMonthlyStripePrice } from '../../src/app/api/ready/route';

function makePrice(overrides: Partial<Stripe.Price> = {}): Stripe.Price {
  return {
    id: 'price_test',
    object: 'price',
    active: true,
    billing_scheme: 'per_unit',
    created: 1,
    currency: 'eur',
    custom_unit_amount: null,
    livemode: true,
    lookup_key: null,
    metadata: {},
    nickname: null,
    product: {
      id: 'prod_test',
      object: 'product',
      active: true,
    } as Stripe.Product,
    recurring: {
      aggregate_usage: null,
      interval: 'month',
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    tax_behavior: 'unspecified',
    tiers_mode: null,
    transform_quantity: null,
    type: 'recurring',
    unit_amount: 2900,
    unit_amount_decimal: '2900',
    ...overrides,
  } as Stripe.Price;
}

describe('Stripe billing readiness', () => {
  it('accepts an active monthly recurring price attached to an active product', () => {
    expect(isBillableMonthlyStripePrice(makePrice())).toBe(true);
  });

  it('rejects archived prices', () => {
    expect(isBillableMonthlyStripePrice(makePrice({ active: false }))).toBe(false);
  });

  it('rejects one-time and non-monthly prices', () => {
    expect(isBillableMonthlyStripePrice(makePrice({ type: 'one_time', recurring: null }))).toBe(false);
    expect(isBillableMonthlyStripePrice(makePrice({
      recurring: { ...makePrice().recurring!, interval: 'year' },
    }))).toBe(false);
  });

  it('rejects inactive, deleted, or unexpanded products', () => {
    expect(isBillableMonthlyStripePrice(makePrice({
      product: { id: 'prod_test', object: 'product', active: false } as Stripe.Product,
    }))).toBe(false);
    expect(isBillableMonthlyStripePrice(makePrice({
      product: { id: 'prod_test', object: 'product', deleted: true } as Stripe.DeletedProduct,
    }))).toBe(false);
    expect(isBillableMonthlyStripePrice(makePrice({ product: 'prod_test' }))).toBe(false);
  });
});
