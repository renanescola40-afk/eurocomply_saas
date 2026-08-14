import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pricingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/pricing/page.tsx'), 'utf8');
const checkoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const organizationDashboard = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/page.tsx'), 'utf8');

describe('public pricing catalog contract', () => {
  it('renders plans from the canonical billing catalog instead of maintaining a second pricing table', () => {
    expect(pricingPage).toContain("BILLING_PLANS, type BillingPlan, type BillingLimit");
    expect(pricingPage).toContain('BILLING_PLANS.map((plan) =>');
    expect(pricingPage).not.toContain('const plans: Plan[]');
    expect(pricingPage).not.toContain("price: '€49'");
    expect(pricingPage).not.toContain("price: '€149'");
    expect(pricingPage).not.toContain("price: '€399'");
  });

  it('derives customer-visible limits and capabilities from the same plan object used by billing', () => {
    expect(pricingPage).toContain('plan.limits.users');
    expect(pricingPage).toContain('plan.limits.organizations');
    expect(pricingPage).toContain('plan.limits.aiSystems');
    expect(pricingPage).toContain('plan.limits.auditLogsDays');
    expect(pricingPage).toContain('plan.features.slice(0, 6).map');
    expect(pricingPage).not.toContain("features: ['1 workspace'");
    expect(pricingPage).not.toContain("features: ['Multi-user workspace'");
    expect(pricingPage).not.toContain("features: ['Department views'");
    expect(pricingPage).not.toContain("features: ['Expanded limits'");
  });

  it('preserves the approved public Essential alias without changing the internal starter authority', () => {
    expect(pricingPage).toContain("starter: {");
    expect(pricingPage).toContain("publicSlug: 'essential'");
    expect(pricingPage).toContain('planPresentation[plan.id].publicSlug');
  });

  it('keeps sales-led plans out of self-serve structured offers', () => {
    expect(pricingPage).toContain('!plan.salesLed && plan.priceMonthly !== null');
    expect(pricingPage).toContain("if (plan.salesLed) return `/${locale}/book-demo?plan=${publicSlug}`");
    expect(pricingPage).toContain("if (plan.id === 'enterprise') return `/${locale}/enterprise`");
  });

  it('surfaces the approved Enterprise starting reference as contract pricing rather than a fake fixed price', () => {
    expect(pricingPage).toContain('plan.startingPriceMonthly');
    expect(pricingPage).toContain('From €');
    expect(pricingPage).toContain('Enterprise uses negotiated contract pricing');
  });

  it('retains prudent claims and VAT/tax messaging on the purchase surface', () => {
    expect(pricingPage).toContain('does not guarantee regulatory compliance');
    expect(pricingPage).toContain('does not replace legal counsel');
    expect(pricingPage).toContain('Taxes or VAT, where applicable');
  });

  it('keeps checkout on the canonical Professional fallback and never exposes technical enterprise sentinel limits', () => {
    expect(checkoutPage).toContain("const DEFAULT_PLAN_ID = 'professional'");
    expect(checkoutPage).toContain("plan.id === 'enterprise' || value === Number.MAX_SAFE_INTEGER ? 'By contract'");
    expect(checkoutPage).toContain('formatCheckoutLimit(selectedPlan, selectedPlan.limits.users)');
    expect(checkoutPage).toContain('formatCheckoutLimit(selectedPlan, selectedPlan.limits.documents)');
    expect(checkoutPage).toContain('formatCheckoutLimit(selectedPlan, selectedPlan.limits.vendors)');
    expect(checkoutPage).toContain('formatCheckoutLimit(selectedPlan, selectedPlan.limits.risks)');
    expect(checkoutPage).not.toContain("const DEFAULT_PLAN_ID = 'growth'");
  });

  it('uses the canonical catalog name on the authenticated dashboard instead of legacy Starter/Growth labels', () => {
    expect(organizationDashboard).toContain('const currentCatalogPlan = getBillingPlan(entitlements.plan)');
    expect(organizationDashboard).toContain('const planName = currentCatalogPlan?.name ?? entitlements.plan');
    expect(organizationDashboard).not.toContain("professional: 'Growth'");
    expect(organizationDashboard).not.toContain("business: 'Growth'");
    expect(organizationDashboard).not.toContain("starter: 'Starter'");
  });
});
