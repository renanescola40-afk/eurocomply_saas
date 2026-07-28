import { BILLING_PLANS } from '@/server/billing/plans';
import { listActiveBillingAddOns } from '@/server/billing/add-ons';
import { noStoreJson } from '@/server/security/no-store';

export async function GET() {
  return noStoreJson({
    currency: 'EUR',
    plans: Object.entries(BILLING_PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      monthlyPriceCents: plan.monthlyPriceCents || null,
      annualPriceCents: plan.annualPriceCents,
      selfServe: plan.selfServe,
      entitlements: plan.entitlements,
    })),
    addOns: listActiveBillingAddOns().map((addOn) => ({
      id: addOn.id,
      slug: addOn.slug,
      name: addOn.name,
      description: addOn.description,
      category: addOn.category,
      priceMonthlyCents: addOn.priceMonthly * 100,
      priceAnnualCents: addOn.priceAnnual * 100,
      availableOn: addOn.availableOn,
      dependencies: addOn.dependencies,
    })),
  });
}
