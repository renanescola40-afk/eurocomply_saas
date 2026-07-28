import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan } from '@/lib/billing/add-ons';
import { canAccessFeature, getPlanLimit, isWithinLimit } from '@/lib/billing/feature-gates';
import { BILLING_PLANS, getBillingPlan, normalizeBillingCatalogPlanId } from '@/lib/billing/plans';
import { isPlanAtLeast, normalizePlan } from '@/server/queries/subscription';

describe('enterprise pricing catalog', () => {
  it('publishes the four canonical tiers at the approved monthly prices', () => {
    expect(BILLING_PLANS.map(({ id, priceMonthly }) => [id, priceMonthly])).toEqual([
      ['starter', 49],
      ['professional', 199],
      ['business', 699],
      ['enterprise', null],
    ]);
  });

  it('keeps legacy names compatible without collapsing Business into Professional', () => {
    expect(normalizePlan('growth')).toBe('professional');
    expect(normalizePlan('business')).toBe('business');
    expect(normalizeBillingCatalogPlanId('essential')).toBe('starter');
    expect(isPlanAtLeast('business', 'professional')).toBe(true);
    expect(isPlanAtLeast('professional', 'business')).toBe(false);
  });

  it('does not expose a fixed Enterprise price', () => {
    const enterprise = getBillingPlan('enterprise');
    expect(enterprise?.salesLed).toBe(true);
    expect(enterprise?.priceMonthly).toBeNull();
    expect(enterprise?.priceAnnual).toBeNull();
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
