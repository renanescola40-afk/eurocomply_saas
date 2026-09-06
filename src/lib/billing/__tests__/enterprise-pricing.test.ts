import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS, getBillingAddOn, isAddOnAvailableForPlan } from '@/lib/billing/add-ons';
import { canAccessFeature, getPlanLimit, isWithinLimit } from '@/lib/billing/feature-gates';
import { BILLING_PLANS, getBillingPlan, normalizeBillingCatalogPlanId } from '@/lib/billing/plans';
import { BILLING_PLANS as SERVER_BILLING_PLANS } from '@/server/billing/plans';
import { isActiveAddOnRow } from '@/server/billing/addons';
import { isPlanAtLeast, normalizePlan } from '@/server/queries/subscription';

const commercialCatalog = JSON.parse(readFileSync('config/billing-commercial-catalog.json', 'utf8')) as {
  currency: string;
  annualBillingMonths: number;
  plans: Record<string, {
    internalId: 'starter' | 'professional' | 'business' | 'enterprise';
    name: string;
    monthlyPriceCents: number | null;
    annualPriceCents: number | null;
    startingMonthlyPriceCents?: number;
    selfServe: boolean;
    salesLed: boolean;
    monthlyPriceEnvKey?: string;
    annualPriceEnvKey?: string;
    legacyMonthlyPriceEnvKeys: string[];
    legacyAnnualPriceEnvKeys: string[];
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

  it('keeps client and server catalogs aligned with the versioned commercial contract', () => {
    expect(commercialCatalog.currency).toBe('EUR');
    expect(commercialCatalog.annualBillingMonths).toBe(10);

    for (const [publicId, commercial] of Object.entries(commercialCatalog.plans)) {
      const plan = getBillingPlan(publicId);
      const serverPlan = SERVER_BILLING_PLANS[commercial.internalId];

      expect(plan?.id).toBe(commercial.internalId);
      expect(plan?.name).toBe(commercial.name);
      expect(plan?.priceMonthly == null ? null : plan.priceMonthly * 100).toBe(commercial.monthlyPriceCents);
      expect(plan?.priceAnnual == null ? null : plan.priceAnnual * 100).toBe(commercial.annualPriceCents);
      expect(plan?.startingPriceMonthly == null ? undefined : plan.startingPriceMonthly * 100)
        .toBe(commercial.startingMonthlyPriceCents ?? commercial.monthlyPriceCents ?? undefined);
      expect(plan?.salesLed).toBe(commercial.salesLed);

      expect(serverPlan.name).toBe(commercial.name);
      expect(serverPlan.monthlyPriceCents || null).toBe(commercial.monthlyPriceCents);
      expect(serverPlan.annualPriceCents).toBe(commercial.annualPriceCents);
      expect(serverPlan.startingMonthlyPriceCents ?? (serverPlan.monthlyPriceCents || null))
        .toBe(commercial.startingMonthlyPriceCents ?? commercial.monthlyPriceCents);
      expect(serverPlan.selfServe).toBe(commercial.selfServe);
      expect(serverPlan.salesLed).toBe(commercial.salesLed);
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

  it('does not promise multi-organization or machine API capacity before those authorities exist', () => {
    expect(getPlanLimit('starter', 'organizations')).toBe(1);
    expect(getPlanLimit('professional', 'organizations')).toBe(1);
    expect(getPlanLimit('business', 'organizations')).toBe(1);
    expect(getPlanLimit('professional', 'apiRequestsMonthly')).toBe(0);
    expect(getPlanLimit('professional', 'webhooks')).toBe(0);
    expect(getPlanLimit('business', 'apiRequestsMonthly')).toBe(0);
    expect(getPlanLimit('business', 'webhooks')).toBe(0);
    expect(getPlanLimit('enterprise', 'apiRequestsMonthly')).toBe('unlimited');
    expect(getPlanLimit('enterprise', 'webhooks')).toBe('unlimited');
  });
});

describe('add-on catalog', () => {
  it('retains the complete future catalog while keeping every add-on private preview', () => {
    expect(BILLING_ADD_ONS).toHaveLength(13);
    expect(getBillingAddOn('extra-user')?.priceMonthly).toBe(8);
    expect(getBillingAddOn('white-label')?.priceMonthly).toBe(299);
    expect(getBillingAddOn('extra-storage-100gb')?.priceAnnual).toBe(190);
    expect(BILLING_ADD_ONS.every((addOn) => addOn.status === 'private_preview')).toBe(true);
  });

  it('fails closed for add-on purchase availability until provider authority is activated', () => {
    const procurement = getBillingAddOn('procurement-pack');
    expect(procurement).toBeDefined();
    expect(procurement && isAddOnAvailableForPlan(procurement, 'starter')).toBe(false);
    expect(procurement && isAddOnAvailableForPlan(procurement, 'professional')).toBe(false);
    expect(procurement?.dependencies).toContain('vendor-assurance');
  });

  it('does not revive a private-preview add-on from a stale active database row', () => {
    expect(isActiveAddOnRow({ add_on_id: 'fria-workspace', status: 'active', current_period_end: null }, new Date())).toBe(false);
  });
});

describe('central feature gates and limits', () => {
  it('licenses features through plan rank but never through a private-preview add-on slug', () => {
    expect(canAccessFeature('tasks', { plan: 'starter' })).toBe(false);
    expect(canAccessFeature('tasks', { plan: 'professional' })).toBe(true);
    expect(canAccessFeature('fria', { plan: 'starter', activeAddOns: ['fria-workspace'] })).toBe(false);
    expect(canAccessFeature('fria', { plan: 'professional', activeAddOns: ['fria-workspace'] })).toBe(true);
    expect(canAccessFeature('sso', { plan: 'business' })).toBe(false);
    expect(canAccessFeature('sso', { plan: 'enterprise' })).toBe(true);
  });

  it('keeps machine API and webhook features on the proven Enterprise control plane', () => {
    expect(canAccessFeature('api', { plan: 'professional' })).toBe(false);
    expect(canAccessFeature('api', { plan: 'business' })).toBe(false);
    expect(canAccessFeature('api', { plan: 'enterprise' })).toBe(true);
    expect(canAccessFeature('webhooks', { plan: 'professional' })).toBe(false);
    expect(canAccessFeature('webhooks', { plan: 'enterprise' })).toBe(true);
  });

  it('fails closed when a feature flag disables a licensed feature', () => {
    expect(canAccessFeature('api', { plan: 'enterprise', featureFlags: { api: false } })).toBe(false);
  });

  it('enforces capacity without special-case conditionals', () => {
    expect(getPlanLimit('starter', 'users')).toBe(3);
    expect(isWithinLimit(2, 1, 3)).toBe(true);
    expect(isWithinLimit(3, 1, 3)).toBe(false);
    expect(isWithinLimit(999999, 1, 'unlimited')).toBe(true);
  });
});
