import { afterEach, describe, expect, it } from 'vitest';

import { normalizeAddOnSelections } from './add-ons';
import { BILLING_PLANS, getStripePriceId, normalizeBillingInterval } from './plans';

describe('enterprise billing lifecycle catalog', () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_STARTER_MONTHLY;
    delete process.env.STRIPE_PRICE_STARTER_ANNUAL;
  });

  it('keeps annual pricing equal to ten monthly payments', () => {
    expect(BILLING_PLANS.starter.annualPriceCents).toBe(BILLING_PLANS.starter.monthlyPriceCents * 10);
    expect(BILLING_PLANS.professional.annualPriceCents).toBe(BILLING_PLANS.professional.monthlyPriceCents * 10);
    expect(BILLING_PLANS.business.annualPriceCents).toBe(BILLING_PLANS.business.monthlyPriceCents * 10);
    expect(BILLING_PLANS.enterprise.annualPriceCents).toBeNull();
  });

  it('resolves monthly and annual Stripe prices independently', () => {
    process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_month';
    process.env.STRIPE_PRICE_STARTER_ANNUAL = 'price_starter_year';
    expect(getStripePriceId('starter', 'month')).toBe('price_starter_month');
    expect(getStripePriceId('starter', 'year')).toBe('price_starter_year');
  });

  it('normalizes billing interval aliases', () => {
    expect(normalizeBillingInterval('annual')).toBe('year');
    expect(normalizeBillingInterval('year')).toBe('year');
    expect(normalizeBillingInterval('monthly')).toBe('month');
  });

  it('deduplicates add-ons and rejects missing dependencies', () => {
    expect(normalizeAddOnSelections([{ slug: 'extra-user', quantity: 3 }, { slug: 'extra-user', quantity: 5 }], 'starter'))
      .toEqual([{ slug: 'extra-user', quantity: 5 }]);
    expect(() => normalizeAddOnSelections([{ slug: 'procurement-pack', quantity: 1 }], 'professional'))
      .toThrow('missing_add_on_dependency_vendor-assurance');
  });

  it('rejects add-ons unavailable for the selected plan', () => {
    expect(() => normalizeAddOnSelections([{ slug: 'white-label', quantity: 1 }], 'starter'))
      .toThrow('invalid_billing_add_on_white-label');
  });
});
