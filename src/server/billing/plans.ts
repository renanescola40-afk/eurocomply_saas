import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlan = CanonicalSubscriptionPlan;

export type BillingEntitlements = {
  users: number;
  documents: number;
  exports: number | 'unlimited';
  auditLogsDays: number;
  aiComplianceFeatures: 'core' | 'advanced' | 'enterprise';
  vendorRisk: boolean;
  customPolicies: boolean;
  prioritySupport: boolean;
};

export const BILLING_PLANS: Record<
  BillingPlan,
  {
    name: string;
    monthlyPriceCents: number;
    envPriceKey: string;
    legacyEnvPriceKeys: string[];
    entitlements: BillingEntitlements;
  }
> = {
  starter: {
    name: 'Starter',
    monthlyPriceCents: 4900,
    envPriceKey: 'STRIPE_PRICE_STARTER_MONTHLY',
    legacyEnvPriceKeys: ['STRIPE_PRICE_ESSENTIAL_MONTHLY'],
    entitlements: {
      users: 3,
      documents: 40,
      exports: 25,
      auditLogsDays: 30,
      aiComplianceFeatures: 'core',
      vendorRisk: false,
      customPolicies: false,
      prioritySupport: false,
    },
  },
  growth: {
    name: 'Growth',
    monthlyPriceCents: 14900,
    envPriceKey: 'STRIPE_PRICE_GROWTH_MONTHLY',
    legacyEnvPriceKeys: ['STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
    entitlements: {
      users: 15,
      documents: 250,
      exports: 250,
      auditLogsDays: 180,
      aiComplianceFeatures: 'advanced',
      vendorRisk: true,
      customPolicies: true,
      prioritySupport: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPriceCents: 99000,
    envPriceKey: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    legacyEnvPriceKeys: ['STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
    entitlements: {
      users: 250,
      documents: 10000,
      exports: 'unlimited',
      auditLogsDays: 3650,
      aiComplianceFeatures: 'enterprise',
      vendorRisk: true,
      customPolicies: true,
      prioritySupport: true,
    },
  },
};

export function normalizeBillingPlanId(plan: string | null | undefined): BillingPlan | undefined {
  const normalized = plan?.trim().toLowerCase();

  if (!normalized) return undefined;
  if (normalized === 'starter' || normalized === 'essential' || normalized === 'basic' || normalized === 'free') return 'starter';
  if (normalized === 'growth' || normalized === 'professional' || normalized === 'pro' || normalized === 'business') return 'growth';
  if (normalized === 'enterprise') return 'enterprise';

  return undefined;
}

export function isSelfServePlan(plan: string): plan is BillingPlan {
  return Boolean(normalizeBillingPlanId(plan));
}

export function getBillingPlan(plan: string | null | undefined) {
  const normalized = normalizeBillingPlanId(plan);
  return normalized ? BILLING_PLANS[normalized] : undefined;
}

export function getBillingEntitlements(plan: string | null | undefined): BillingEntitlements {
  const billingPlan = getBillingPlan(plan) ?? BILLING_PLANS.starter;
  return billingPlan.entitlements;
}

export function getStripePriceId(plan: BillingPlan) {
  const billingPlan = BILLING_PLANS[plan];
  const priceId = process.env[billingPlan.envPriceKey] ?? billingPlan.legacyEnvPriceKeys.map((key) => process.env[key]).find(Boolean);

  if (!priceId) {
    throw new Error(`missing_stripe_price_${plan}`);
  }

  return priceId;
}
