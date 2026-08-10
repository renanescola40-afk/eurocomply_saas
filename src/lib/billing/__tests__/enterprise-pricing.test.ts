import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan } from '@/lib/billing/add-ons';
import { canAccessFeature, getPlanLimit, isWithinLimit } from '@/lib/billing/feature-gates';
import { BILLING_PLANS, getBillingPlan, normalizeBillingCatalogPlanId } from '@/lib/billing/plans';
import { isPlanAtLeast, normalizePlan } from '@/server/queries/subscription';

const commercialCatalog = JSON.parse(readFileSync('config/billing-commercial-catalog.json', 'utf8')) as {
  currency: string;
  annualBillingMonths: number;
  plans: Record<string, {
    internalId: string;
    name: string;
    monthlyPriceCents: number | null;
    annualPriceCents: number | null;
    startingMonthlyPriceCents?: number;
    selfServe: boolean;
    salesLed: boolean;
    monthlyPriceEnvKey?: string;
    annualPriceEnvKey?: string;
    legacyMonthlyPriceEnvKeys: string[];
  }>;
};

describe('enterprise pricing catalog', () => {
  it('publishes the four canonical tiers at the approved monthly prices', () => {
    expect(BILLING_PLANS.map(({ id, name, priceMonthly }) => [id, name, priceMonthly])).toEqual([
      ['starter', 'Essential', 49],
      ['professional', 'Professional', 149],
      ['business', 'Business', 399],
      ['enterprise', 'Enterprise', null],
    ]);
    expect(getBillingPlan('enterprise')?.startingPriceMonthly).toBe(990);
  });

  it('keeps repository catalog values aligned with the versioned commercial contract', () => {
    expect(commercialCatalog.currency).toBe('EUR');
    expect(commercialCatalog.annualBillingMonths).toBe(10);

    for (const [publicId, commercial] of Object.entries(commercialCatalog.plans)) {
      const plan = getBillingPlan(publicId);
      expect(plan?.id).toBe(commercial.internalId);
      expect(plan?.name).toBe(commercial.name);
      expect(plan?.priceMonthly == null ? null : plan.priceMonthly * 100).toBe(commercial.monthlyPriceCents);
      expect(plan?.priceAnnual == null ? null : plan.priceAnnual * 100).toBe(commercial.annualPriceCents);
      expect(plan?.salesLed).toBe(commercial.salesLed);
    }
  });

  it('keeps legacy names compatible without collapsing Business into Professional', () => {
    expect(normalizePlan('growth')).toBe('professional');
    expect(normalizePlan('business')).toBe('business');
    expect(normalizeBillingCatalogPlanId('essential')).toBe('starter');
    expect(normalizeBillingCatalogPlanId('starter')).toBe('starter');
    expect(isPlanAtLeast('business', 'professional')).toBe(true);
    expect(isPlanAtLeast('professional', 'business')).toBe(false);
  });

  it('keeps Essential and Professional self-serve while Business and Enterprise remain sales-led', () => {
    expect(getBillingPlan('essential')?.salesLed).toBe(false);
    expect(getBillingPlan('professional')?.salesLed).toBe(false);
    expect(getBillingPlan('business')?.salesLed).toBe(true);
    expect(getBillingPlan('enterprise')?.salesLed).toBe(true);
  });

  it('does not expose a fixed Enterprise Stripe subscription price', () => {
    const enterprise = getBillingPlan('enterprise');
    expect(enterprise?.salesLed).toBe(true);
    expect(enterprise?.priceMonthly).toBeNull();
    expect(enterprise?.priceAnnual).toBeNull();
    expect(enterprise?.startingPriceMonthly).toBe(990);
    expect(enterprise?.stripePriceEnvKeyMonthly).toBeUndefined();
  });
});

describe('add-on catalog', () => {
  it('contains all required independent add-ons', () => {
    expect(BILLING_ADD_ONS).toHaveLength(13);
    expect(getBillingAddOn('extra-user')?.priceMonthly).toBe(8);
    expect(getBillingAddOn('white-label')?.priceMonthly).toBe(299);
    expect(getBillingAddOn('extra-storage-100gb')?.priceAnnual).toBe(190);
  });

  it('enforces plan availability and dependencies', () => {
    const procurement = getBillingAddOn('procurement-pack');
    expect(procurement).toBeDefined();
    expect(procurement && isAddOnAvailableForPlan(procurement, 'starter')).toBe(false);
    expect(procurement && isAddOnAvailableForPlan(procurement, 'professional')).toBe(true);
    expect(procurement?.dependencies).toContain('vendor-assurance');
  });
});

describe('central feature gates and limits', () => {
  it('licenses features through plan rank or an eligible add-on', () => {
    expect(canAccessFeature('tasks', { plan: 'starter' })).toBe(false);
    expect(canAccessFeature('tasks', { plan: 'professional' })).toBe(true);
    expect(canAccessFeature('fria', { plan: 'starter', activeAddOns: ['fria-workspace'] })).toBe(true);
    expect(canAccessFeature('sso', { plan: 'business' })).toBe(false);
    expect(canAccessFeature('sso', { plan: 'enterprise' })).toBe(true);
  });

  it('fails closed when a feature flag disables a licensed feature', () => {
    expect(canAccessFeature('api', { plan: 'professional', featureFlags: { api: false } })).toBe(false);
  });

  it('enforces capacity without special-case conditionals', () => {
    expect(getPlanLimit('starter', 'users')).toBe(3);
    expect(isWithinLimit(2, 1, 3)).toBe(true);
    expect(isWithinLimit(3, 1, 3)).toBe(false);
    expect(isWithinLimit(999999, 1, 'unlimited')).toBe(true);
  });
});
