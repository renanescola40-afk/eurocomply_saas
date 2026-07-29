import type { CanonicalSubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlan = CanonicalSubscriptionPlan;
export type BillingInterval = 'month' | 'year';

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

type BillingPlanDefinition = {
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number | null;
  monthlyEnvPriceKey?: string;
  annualEnvPriceKey?: string;
  legacyEnvPriceKeys: string[];
  selfServe: boolean;
  entitlements: BillingEntitlements;
};

export const BILLING_PLANS: Record<BillingPlan, BillingPlanDefinition> = {
  starter: {
    name: 'Starter', monthlyPriceCents: 4900, annualPriceCents: 49000,
    monthlyEnvPriceKey: 'STRIPE_PRICE_STARTER_MONTHLY', annualEnvPriceKey: 'STRIPE_PRICE_STARTER_ANNUAL',
    legacyEnvPriceKeys: ['STRIPE_PRICE_ESSENTIAL_MONTHLY'], selfServe: true,
    entitlements: { users: 3, documents: 100, exports: 25, auditLogsDays: 30, aiComplianceFeatures: 'core', vendorRisk: false, customPolicies: false, prioritySupport: false },
  },
  professional: {
    name: 'Professional', monthlyPriceCents: 19900, annualPriceCents: 199000,
    monthlyEnvPriceKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', annualEnvPriceKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    legacyEnvPriceKeys: ['STRIPE_PRICE_GROWTH_MONTHLY'], selfServe: true,
    entitlements: { users: 15, documents: 1000, exports: 500, auditLogsDays: 180, aiComplianceFeatures: 'advanced', vendorRisk: true, customPolicies: true, prioritySupport: false },
  },
  business: {
    name: 'Business', monthlyPriceCents: 69900, annualPriceCents: 699000,
    monthlyEnvPriceKey: 'STRIPE_PRICE_BUSINESS_MONTHLY', annualEnvPriceKey: 'STRIPE_PRICE_BUSINESS_ANNUAL',
    legacyEnvPriceKeys: [], selfServe: false,
    entitlements: { users: 75, documents: 10000, exports: 5000, auditLogsDays: 730, aiComplianceFeatures: 'advanced', vendorRisk: true, customPolicies: true, prioritySupport: true },
  },
  enterprise: {
    name: 'Enterprise', monthlyPriceCents: 0, annualPriceCents: null,
    legacyEnvPriceKeys: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'], selfServe: false,
    entitlements: { users: Number.MAX_SAFE_INTEGER, documents: Number.MAX_SAFE_INTEGER, exports: 'unlimited', auditLogsDays: 3650, aiComplianceFeatures: 'enterprise', vendorRisk: true, customPolicies: true, prioritySupport: true },
  },
};

export function normalizeBillingPlanId(plan: string | null | undefined): BillingPlan | undefined {
  const normalized = plan?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'starter' || normalized === 'essential' || normalized === 'basic' || normalized === 'free') return 'starter';
  if (normalized === 'growth' || normalized === 'professional' || normalized === 'pro') return 'professional';
  if (normalized === 'business') return 'business';
  if (normalized === 'enterprise') return 'enterprise';
  return undefined;
}

export function normalizeBillingInterval(value: string | null | undefined): BillingInterval {
  return value?.trim().toLowerCase() === 'year' || value?.trim().toLowerCase() === 'annual' ? 'year' : 'month';
}

export function isSelfServePlan(plan: string): plan is 'starter' | 'professional' {
  const normalized = normalizeBillingPlanId(plan);
  return normalized === 'starter' || normalized === 'professional';
}

export function isSalesLedPlan(plan: string): plan is 'business' | 'enterprise' {
  const normalized = normalizeBillingPlanId(plan);
  return normalized === 'business' || normalized === 'enterprise';
}

export function getBillingPlan(plan: string | null | undefined) {
  const normalized = normalizeBillingPlanId(plan);
  return normalized ? BILLING_PLANS[normalized] : undefined;
}

export function getBillingEntitlements(plan: string | null | undefined): BillingEntitlements {
  return (getBillingPlan(plan) ?? BILLING_PLANS.starter).entitlements;
}

export function getStripePriceId(plan: BillingPlan, interval: BillingInterval = 'month') {
  const definition = BILLING_PLANS[plan];
  const primaryKey = interval === 'year' ? definition.annualEnvPriceKey : definition.monthlyEnvPriceKey;
  const priceId = (primaryKey ? process.env[primaryKey] : undefined) ?? (interval === 'month' ? definition.legacyEnvPriceKeys.map((key) => process.env[key]).find(Boolean) : undefined);
  if (!priceId) throw new Error(`missing_stripe_price_${plan}_${interval}`);
  return priceId;
}
