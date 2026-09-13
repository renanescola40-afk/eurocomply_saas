import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BILLING_ADD_ONS } from '@/lib/billing/add-ons';
import { BILLING_PLANS } from '@/lib/billing/plans';
import { BILLING_PLANS as SERVER_BILLING_PLANS } from '@/server/billing/plans';

const onboardingPage = readFileSync('src/app/[locale]/onboarding/page.tsx', 'utf8');
const addOnAdapter = readFileSync('src/lib/billing/addons.ts', 'utf8');
const billingCatalogRoute = readFileSync('src/app/api/billing/catalog/route.ts', 'utf8');

describe('commercial price completeness', () => {
  it('has positive fixed or starting prices for every canonical paid plan', () => {
    for (const plan of BILLING_PLANS) {
      if (plan.priceMonthly !== null) {
        expect(plan.priceMonthly).toBeGreaterThan(0);
      } else {
        expect(plan.startingPriceMonthly).toBeGreaterThan(0);
      }
    }

    expect(SERVER_BILLING_PLANS.enterprise.monthlyPriceCents).toBeNull();
    expect(SERVER_BILLING_PLANS.enterprise.startingMonthlyPriceCents).toBe(99000);
  });

  it('has positive monthly and annual catalog prices for every add-on', () => {
    expect(BILLING_ADD_ONS).toHaveLength(13);
    for (const addOn of BILLING_ADD_ONS) {
      expect(addOn.priceMonthly).toBeGreaterThan(0);
      expect(addOn.priceAnnual).toBe(addOn.priceMonthly * 10);
    }
  });

  it('renders starting-price plans during payment-first onboarding', () => {
    expect(onboardingPage).toContain('plan.startingPriceMonthly != null');
    expect(onboardingPage).toContain('pricingCopy.from');
    expect(onboardingPage).toContain('pricingCopy.month');
  });

  it('does not keep orphan credit-pack commercial prices or obsolete dashboard pricing', () => {
    expect(addOnAdapter).not.toContain('CREDIT_PACKS');
    expect(addOnAdapter).not.toContain('credits_100');
    expect(existsSync('src/dashboard/page.tsx')).toBe(false);
  });

  it('preserves null as explicit contract pricing instead of truthy price coercion', () => {
    expect(billingCatalogRoute).toContain('monthlyPriceCents: plan.monthlyPriceCents ?? null');
    expect(billingCatalogRoute).not.toContain('monthlyPriceCents: plan.monthlyPriceCents || null');
  });
});
