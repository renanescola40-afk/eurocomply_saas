import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { listActiveBillingAddOns } from '@/server/billing/add-ons';
import { BILLING_PLANS } from '@/server/billing/plans';
import { noStoreJson } from '@/server/security/no-store';

const BILLING_CATALOG_RATE_LIMIT = 60;
const BILLING_CATALOG_RATE_LIMIT_WINDOW_MS = 60_000;

const PUBLIC_PLAN_IDS = {
  starter: 'essential',
  professional: 'professional',
  business: 'business',
  enterprise: 'enterprise',
} as const;

type PublicBillingPlan = (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

function getPublicPlanEntitlements(plan: PublicBillingPlan) {
  return {
    users: plan.entitlements.users,
    documents: plan.entitlements.documents,
    auditLogsDays: plan.entitlements.auditLogsDays,
    aiComplianceFeatures: plan.entitlements.aiComplianceFeatures,
    vendorRisk: plan.entitlements.vendorRisk,
    customPolicies: plan.entitlements.customPolicies,
    prioritySupport: plan.entitlements.prioritySupport,
  };
}

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
      publicId: PUBLIC_PLAN_IDS[id as keyof typeof PUBLIC_PLAN_IDS],
      name: plan.name,
      monthlyPriceCents: plan.monthlyPriceCents || null,
      // Annual values remain internal commercial references while the lifecycle
      // endpoint deliberately rejects annual self-service mutations. Publishing
      // them here would advertise a checkout option the runtime does not offer.
      annualPriceCents: null,
      startingMonthlyPriceCents: plan.startingMonthlyPriceCents ?? (plan.monthlyPriceCents || null),
      selfServe: plan.selfServe,
      salesLed: plan.salesLed,
      // Export count is intentionally not published until a durable monthly
      // usage authority enforces it across the paid export surface. Keep the
      // internal catalog value available for future rollout without presenting
      // an unenforced numerical allowance as a current customer entitlement.
      entitlements: getPublicPlanEntitlements(plan),
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
