import {
  BILLING_ADD_ONS,
  type AddOnCategory,
  type AddOnStatus,
  type BillingAddOnSlug,
} from '@/lib/billing/add-ons';
import type { SubscriptionPlan } from '@/server/queries/subscription';

export type AddOnId = BillingAddOnSlug;

export type AddOnCatalogItem = {
  id: AddOnId;
  name: string;
  priceMonthly: number;
  description: string;
  includedFromPlan?: SubscriptionPlan;
  availableFromPlan: SubscriptionPlan;
  category: AddOnCategory;
  status: AddOnStatus;
};

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  essential: 1,
  starter: 1,
  growth: 2,
  professional: 2,
  business: 3,
  enterprise: 4,
};

// Compatibility adapter for the pre-enterprise add-ons page. The commercial
// catalog itself lives in ./add-ons; do not create a second product/price list
// here. organization_add_ons stores the canonical slug as add_on_id.
export const ADD_ON_CATALOG: AddOnCatalogItem[] = BILLING_ADD_ONS.map((addOn) => ({
  id: addOn.slug,
  name: addOn.name,
  priceMonthly: addOn.priceMonthly,
  description: addOn.description,
  includedFromPlan: addOn.includedFrom,
  availableFromPlan: addOn.availableOn[0] ?? 'enterprise',
  category: addOn.category,
  status: addOn.status,
}));

export function billingPlanAtLeast(plan: SubscriptionPlan, minimumPlan: SubscriptionPlan) {
  return PLAN_RANK[plan] >= PLAN_RANK[minimumPlan];
}

export function getPlanDisplayName(plan: SubscriptionPlan) {
  if (plan === 'enterprise') return 'Enterprise';
  if (plan === 'business') return 'Business';
  if (plan === 'growth' || plan === 'professional') return 'Professional';
  return 'Essential';
}

export function getAddOnStatus(plan: SubscriptionPlan, addOn: AddOnCatalogItem, activeAddOnIds: AddOnId[] = []) {
  if (addOn.status !== 'active') {
    return 'preview' as const;
  }

  if (addOn.includedFromPlan && billingPlanAtLeast(plan, addOn.includedFromPlan)) {
    return 'included' as const;
  }

  if (activeAddOnIds.includes(addOn.id)) {
    return 'active' as const;
  }

  if (!billingPlanAtLeast(plan, addOn.availableFromPlan)) {
    return 'blocked' as const;
  }

  return 'inactive' as const;
}
