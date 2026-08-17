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
  startingMonthlyPriceCents?: number | null;
  monthlyEnvPriceKey?: string;
  annualEnvPriceKey?: string;
  legacyMonthlyEnvPriceKeys: string[];
  legacyAnnualEnvPriceKeys: string[];
  selfServe: boolean;
  salesLed: boolean;
  entitlements: BillingEntitlements;
};

export const BILLING_PLANS: Record<BillingPlan, BillingPlanDefinition> = {
  starter: {
    name: 'Essential',
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
    startingMonthlyPriceCents: 4900,
    monthlyEnvPriceKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    annualEnvPriceKey: 'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    legacyMonthlyEnvPriceKeys: ['STRIPE_PRICE_STARTER_MONTHLY'],
    legacyAnnualEnvPriceKeys: ['STRIPE_PRICE_STARTER_ANNUAL'],
    selfServe: true,
    salesLed: false,
    entitlements: { users: 3, documents: 100, exports: 25, auditLogsDays: 30, aiComplianceFeatures: 'core', vendorRisk: false, customPolicies: false, prioritySupport: false },
  },
  professional: {
    name: 'Professional',
    monthlyPriceCents: 14900,
    annualPriceCents: 149000,
    startingMonthlyPriceCents: 14900,
    monthlyEnvPriceKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    annualEnvPriceKey: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    legacyMonthlyEnvPriceKeys: ['STRIPE_PRICE_GROWTH_MONTHLY'],
    legacyAnnualEnvPriceKeys: ['STRIPE_PRICE_GROWTH_ANNUAL'],
    selfServe: true,
    salesLed: false,
    entitlements: { users: 15, documents: 1000, exports: 500, auditLogsDays: 180, aiComplianceFeatures: 'advanced', vendorRisk: true, customPolicies: true, prioritySupport: false },
  },
  business: {
    name: 'Business',
    monthlyPriceCents: 39900,
    annualPriceCents: 399000,
    startingMonthlyPriceCents: 39900,
    monthlyEnvPriceKey: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    annualEnvPriceKey: 'STRIPE_PRICE_BUSINESS_ANNUAL',
    legacyMonthlyEnvPriceKeys: [],
    legacyAnnualEnvPriceKeys: [],
    selfServe: false,
    salesLed: true,
    entitlements: { users: 75, documents: 10000, exports: 5000, auditLogsDays: 730, aiComplianceFeatures: 'advanced', vendorRisk: true, customPolicies: true, prioritySupport: true },
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPriceCents: 0,
    annualPriceCents: null,
    startingMonthlyPriceCents: 99000,
    legacyMonthlyEnvPriceKeys: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
    legacyAnnualEnvPriceKeys: ['STRIPE_PRICE_ENTERPRISE_ANNUAL'],
    selfServe: false,
    salesLed: true,
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
  const primaryPriceId = primaryKey ? process.env[primaryKey]?.trim() : undefined;

  // Self-serve checkout must bind to the canonical reviewed price. Legacy
  // Starter/Growth environment keys are migration metadata only; silently using
  // them can charge an obsolete amount while granting current entitlements.
  if (definition.selfServe) {
    if (!primaryPriceId) throw new Error(`missing_stripe_price_${plan}_${interval}`);
    return primaryPriceId;
  }

  const legacyKeys = interval === 'year' ? definition.legacyAnnualEnvPriceKeys : definition.legacyMonthlyEnvPriceKeys;
  const legacyPriceId = legacyKeys.map((key) => process.env[key]?.trim()).find(Boolean);
  const priceId = primaryPriceId || legacyPriceId;
  if (!priceId) throw new Error(`missing_stripe_price_${plan}_${interval}`);
  return priceId;
}
