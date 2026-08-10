import { afterEach, describe, expect, it } from 'vitest';

import { normalizeAddOnSelections } from './add-ons';
import { BILLING_PLANS, getStripePriceId, normalizeBillingInterval } from './plans';

describe('enterprise billing lifecycle catalog', () => {
  afterEach(() => {
    for (const key of [
      'STRIPE_PRICE_ESSENTIAL_MONTHLY',
      'STRIPE_PRICE_ESSENTIAL_ANNUAL',
      'STRIPE_PRICE_STARTER_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
      'STRIPE_PRICE_GROWTH_MONTHLY',
      'STRIPE_PRICE_BUSINESS_MONTHLY',
      'STRIPE_PRICE_BUSINESS_ANNUAL',
    ]) {
      delete process.env[key];
    }
  });

  it('keeps annual pricing equal to ten monthly payments', () => {
    expect(BILLING_PLANS.starter.annualPriceCents).toBe(BILLING_PLANS.starter.monthlyPriceCents * 10);
    expect(BILLING_PLANS.professional.annualPriceCents).toBe(BILLING_PLANS.professional.monthlyPriceCents * 10);
    expect(BILLING_PLANS.business.annualPriceCents).toBe(BILLING_PLANS.business.monthlyPriceCents * 10);
    expect(BILLING_PLANS.enterprise.annualPriceCents).toBeNull();
  });

  it('uses canonical Essential monthly and annual Stripe price keys', () => {
    process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_essential_month';
    process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL = 'price_essential_year';
    expect(getStripePriceId('starter', 'month')).toBe('price_essential_month');
    expect(getStripePriceId('starter', 'year')).toBe('price_essential_year');
  });

  it('preserves the legacy Starter monthly key only as a transition fallback', () => {
    process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_legacy_starter_month';
    expect(getStripePriceId('starter', 'month')).toBe('price_legacy_starter_month');
    expect(() => getStripePriceId('starter', 'year')).toThrow('missing_stripe_price_starter_year');
  });

  it('prefers canonical Professional price over the legacy Growth fallback', () => {
    process.env.STRIPE_PRICE_GROWTH_MONTHLY = 'price_legacy_growth';
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professional';
    expect(getStripePriceId('professional', 'month')).toBe('price_professional');
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
