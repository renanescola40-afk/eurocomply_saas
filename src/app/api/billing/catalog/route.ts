import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { listActiveBillingAddOns } from '@/server/billing/add-ons';
import { BILLING_PLANS } from '@/server/billing/plans';
import { noStoreJson } from '@/server/security/no-store';

const BILLING_CATALOG_RATE_LIMIT = 60;
const BILLING_CATALOG_RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const rateLimit = await checkDistributedRateLimit({
    key: `billing-catalog:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
    limit: BILLING_CATALOG_RATE_LIMIT,
    windowMs: BILLING_CATALOG_RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

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
