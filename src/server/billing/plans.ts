import type { SubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlan = Exclude<SubscriptionPlan, 'enterprise'>;

export const BILLING_PLANS: Record<BillingPlan, {
  name: string;
  monthlyPriceCents: number;
  envPriceKey: string;
}> = {
  essential: {
    name: 'Essential',
    monthlyPriceCents: 4900,
    envPriceKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  },
  professional: {
    name: 'Professional',
    monthlyPriceCents: 14900,
    envPriceKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  },
  business: {
    name: 'Business',
    monthlyPriceCents: 39900,
    envPriceKey: 'STRIPE_PRICE_BUSINESS_MONTHLY',
  },
};

export function isSelfServePlan(plan: string): plan is BillingPlan {
  return plan === 'essential' || plan === 'professional' || plan === 'business';
}

export function getStripePriceId(plan: BillingPlan) {
  const priceId = process.env[BILLING_PLANS[plan].envPriceKey];

  if (!priceId) {
    throw new Error(`missing_stripe_price_${plan}`);
  }

  return priceId;
}
