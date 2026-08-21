import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import {
  CANONICAL_STRIPE_READINESS_BINDINGS,
  isCanonicalStripePriceForReadiness,
  type StripeReadinessBinding,
} from '../../src/app/api/ready/route';

function makeProduct(
  binding: StripeReadinessBinding,
  overrides: {
    active?: boolean;
    billingPlanId?: string;
    catalogStatus?: string;
  } = {},
): Stripe.Product {
  return {
    id: 'prod_test',
    object: 'product',
    active: overrides.active ?? true,
    metadata: {
      billing_plan_id: overrides.billingPlanId ?? binding.publicPlanId,
      catalog_status: overrides.catalogStatus ?? 'canonical_live',
    },
  } as unknown as Stripe.Product;
}

function makePrice(
  binding: StripeReadinessBinding,
  overrides: Partial<Stripe.Price> = {},
): Stripe.Price {
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
    product: makeProduct(binding),
    recurring: {
      aggregate_usage: null,
      interval: binding.interval,
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    tax_behavior: 'unspecified',
    tiers_mode: null,
    transform_quantity: null,
    type: 'recurring',
    unit_amount: binding.expectedAmountCents,
    unit_amount_decimal: String(binding.expectedAmountCents),
    ...overrides,
  } as Stripe.Price;
}

describe('Stripe billing readiness', () => {
  it('defines exactly the four canonical self-serve runtime bindings', () => {
    expect(CANONICAL_STRIPE_READINESS_BINDINGS).toEqual([
      expect.objectContaining({ publicPlanId: 'essential', interval: 'month', expectedAmountCents: 4900 }),
      expect.objectContaining({ publicPlanId: 'essential', interval: 'year', expectedAmountCents: 49000 }),
      expect.objectContaining({ publicPlanId: 'professional', interval: 'month', expectedAmountCents: 14900 }),
      expect.objectContaining({ publicPlanId: 'professional', interval: 'year', expectedAmountCents: 149000 }),
    ]);
  });

  it('accepts every canonical LIVE price contract', () => {
    for (const binding of CANONICAL_STRIPE_READINESS_BINDINGS) {
      expect(isCanonicalStripePriceForReadiness(makePrice(binding), binding)).toBe(true);
    }
  });

  it('rejects test-mode, archived, wrong-currency, wrong-amount and wrong-cadence prices', () => {
    const binding = CANONICAL_STRIPE_READINESS_BINDINGS[0];

    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { livemode: false }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { active: false }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { currency: 'usd' }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { unit_amount: binding.expectedAmountCents + 1 }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { type: 'one_time', recurring: null }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      recurring: { ...makePrice(binding).recurring!, interval: 'year' },
    }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      recurring: { ...makePrice(binding).recurring!, interval_count: 2 },
    }), binding)).toBe(false);
  });

  it('rejects inactive, deleted, or unexpanded products', () => {
    const binding = CANONICAL_STRIPE_READINESS_BINDINGS[0];

    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      product: makeProduct(binding, { active: false }),
    }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      product: { id: 'prod_test', object: 'product', deleted: true } as unknown as Stripe.DeletedProduct,
    }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, { product: 'prod_test' }), binding)).toBe(false);
  });

  it('rejects products that are active but not canonical for the expected plan', () => {
    const binding = CANONICAL_STRIPE_READINESS_BINDINGS[0];

    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      product: makeProduct(binding, { billingPlanId: 'professional' }),
    }), binding)).toBe(false);
    expect(isCanonicalStripePriceForReadiness(makePrice(binding, {
      product: makeProduct(binding, { catalogStatus: 'legacy' }),
    }), binding)).toBe(false);
  });
});
