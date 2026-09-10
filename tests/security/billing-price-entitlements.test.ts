import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getBillingPlanIdForStripePriceId } from '../../src/lib/billing/plans';

const processor = readFileSync(join(process.cwd(), 'src/server/billing/stripe-webhooks.ts'), 'utf8');
const keys = [
  'STRIPE_' + 'PRICE_STARTER_MONTHLY',
  'STRIPE_' + 'PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_' + 'PRICE_GROWTH_MONTHLY',
  'STRIPE_' + 'PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_' + 'PRICE_BUSINESS_MONTHLY',
  'STRIPE_' + 'PRICE_ENTERPRISE_MONTHLY',
  'STRIPE_' + 'PRICE_BUSINESS_ENTERPRISE_MONTHLY',
];

describe('billing Stripe price entitlements', () => {
  afterEach(() => {
    for (const key of keys) {
      delete process.env[key];
    }
  });

  it('maps current and legacy Stripe prices to canonical server-side plans', () => {
    process.env['STRIPE_' + 'PRICE_STARTER_MONTHLY'] = 'price_starter_current';
    process.env['STRIPE_' + 'PRICE_BUSINESS_MONTHLY'] = 'price_business_current';
    process.env['STRIPE_' + 'PRICE_ENTERPRISE_MONTHLY'] = 'price_enterprise_current';

    expect(getBillingPlanIdForStripePriceId('price_starter_current')).toBe('starter');
    expect(getBillingPlanIdForStripePriceId('price_business_current')).toBe('business');
    expect(getBillingPlanIdForStripePriceId('price_enterprise_current')).toBe('enterprise');
    expect(getBillingPlanIdForStripePriceId('price_unknown')).toBeUndefined();
  });

  it('syncs webhook entitlements only from allowlisted Stripe price IDs', () => {
    expect(processor).toContain('resolveStripeSubscriptionPlan');
    expect(processor).toContain('getBillingPlanIdForStripePriceId(stripePriceId)');
    expect(processor).toContain("source: 'stripe_price_id'");
    expect(processor).toContain("source: mappedBaseItems.length > 1 ? 'ambiguous' as const : 'unresolved' as const");
    expect(processor).not.toContain("source: 'subscription_metadata_fallback'");
    expect(processor).toContain('Missing or unrecognized canonical Stripe price on subscription');
    expect(processor).toContain('planSource: planResolution.source');
    expect(processor).toContain('stripePriceId: planResolution.stripePriceId');
  });

  it('does not assume the first Stripe subscription item is the base plan', () => {
    expect(processor).toContain('const mappedBaseItems = items');
    expect(processor).toContain('.map((item) => {');
    expect(processor).toContain('mappedBaseItems.length !== 1');
    expect(processor).not.toContain('items?.data?.[0]?.price?.id');
  });

  it('persists the billing interval from the resolved base plan item', () => {
    expect(processor).toContain("recurringInterval === 'year'");
    expect(processor).toContain("recurringInterval === 'month'");
    expect(processor).toContain('billing_interval: planResolution.billingInterval');
    expect(processor).toContain('billingInterval: planResolution.billingInterval');
  });
});
