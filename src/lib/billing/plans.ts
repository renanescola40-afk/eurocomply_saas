import type { CanonicalSubscriptionPlan, LegacySubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlanId = CanonicalSubscriptionPlan | LegacySubscriptionPlan;
type CatalogBillingPlanId = CanonicalSubscriptionPlan;

export type BillingEntitlements = {
  users: number;
  documents: number;
  vendors: number;
  risks: number;
  exports: number | 'unlimited';
  auditLogsDays: number;
  aiComplianceFeatures: 'core' | 'advanced' | 'enterprise';
  vendorRisk: boolean;
  customPolicies: boolean;
  prioritySupport: boolean;
};

export type BillingPlan = {
  id: CatalogBillingPlanId;
  name: string;
  priceMonthly: number;
  stripePriceEnvKey: string;
  legacyStripePriceEnvKeys: string[];
  limits: {
    users: number;
    documents: number;
    vendors: number;
    risks: number;
    exports: number | 'unlimited';
    auditLogsDays: number;
  };
  entitlements: BillingEntitlements;
  features: string[];
};

export type BillingPlanCatalog = [BillingPlan, ...BillingPlan[]];

const BILLING_PLAN_IDS: BillingPlanId[] = ['starter', 'growth', 'enterprise', 'essential', 'professional', 'business'];

const BILLING_PLAN_ALIASES: Record<string, BillingPlanId> = {
  basic: 'starter',
  free: 'starter',
  pro: 'growth',
};

const CATALOG_PLAN_BY_ID: Record<BillingPlanId, CatalogBillingPlanId> = {
  essential: 'starter',
  starter: 'starter',
  professional: 'growth',
  growth: 'growth',
  business: 'growth',
  enterprise: 'enterprise',
};

export const BILLING_PLANS: BillingPlanCatalog = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    stripePriceEnvKey: 'STRIPE_PRICE_STARTER_MONTHLY',
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_ESSENTIAL_MONTHLY'],
    limits: { users: 3, documents: 40, vendors: 15, risks: 30, exports: 25, auditLogsDays: 30 },
    entitlements: {
      users: 3,
      documents: 40,
      vendors: 15,
      risks: 30,
      exports: 25,
      auditLogsDays: 30,
      aiComplianceFeatures: 'core',
      vendorRisk: false,
      customPolicies: false,
      prioritySupport: false,
    },
    features: ['Core workspace', 'Policy templates', 'Document register', 'Basic exports', '30-day audit logs'],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 149,
    stripePriceEnvKey: 'STRIPE_PRICE_GROWTH_MONTHLY',
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
    limits: { users: 15, documents: 250, vendors: 75, risks: 150, exports: 250, auditLogsDays: 180 },
    entitlements: {
      users: 15,
      documents: 250,
      vendors: 75,
      risks: 150,
      exports: 250,
      auditLogsDays: 180,
      aiComplianceFeatures: 'advanced',
      vendorRisk: true,
      customPolicies: true,
      prioritySupport: false,
    },
    features: ['Advanced governance', 'Vendor risk workflows', 'Custom policies', 'Board-ready exports', '180-day audit logs'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 990,
    stripePriceEnvKey: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
    limits: { users: 250, documents: 10000, vendors: 2500, risks: 5000, exports: 'unlimited', auditLogsDays: 3650 },
    entitlements: {
      users: 250,
      documents: 10000,
      vendors: 2500,
      risks: 5000,
      exports: 'unlimited',
      auditLogsDays: 3650,
      aiComplianceFeatures: 'enterprise',
      vendorRisk: true,
      customPolicies: true,
      prioritySupport: true,
    },
    features: ['Enterprise governance', 'Unlimited exports', 'Evidence pack', 'Priority support', '10-year audit logs'],
  },
];

export function normalizeBillingPlanId(planId: string | null | undefined): BillingPlanId | undefined {
  const normalized = planId?.toLowerCase().trim();

  if (!normalized) return undefined;
  if (BILLING_PLAN_IDS.includes(normalized as BillingPlanId)) return normalized as BillingPlanId;

  return BILLING_PLAN_ALIASES[normalized];
}

export function normalizeBillingCatalogPlanId(planId: string | null | undefined): CatalogBillingPlanId | undefined {
  const normalizedPlanId = normalizeBillingPlanId(planId);
  return normalizedPlanId ? CATALOG_PLAN_BY_ID[normalizedPlanId] : undefined;
}

export function getBillingPlan(planId: string | null | undefined) {
  const normalizedPlanId = normalizeBillingCatalogPlanId(planId);

  return BILLING_PLANS.find((plan) => plan.id === normalizedPlanId);
}

export function getBillingEntitlements(planId: string | null | undefined): BillingEntitlements {
  return getBillingPlan(planId)?.entitlements ?? BILLING_PLANS[0].entitlements;
}

export function getStripePriceId(plan: BillingPlan) {
  return process.env[plan.stripePriceEnvKey] ?? plan.legacyStripePriceEnvKeys.map((key) => process.env[key]).find(Boolean);
}

export function getBillingPlanIdForStripePriceId(priceId: string | null | undefined): CatalogBillingPlanId | undefined {
  const normalizedPriceId = priceId?.trim();

  if (!normalizedPriceId) return undefined;

  for (const plan of BILLING_PLANS) {
    const configuredPriceIds = [process.env[plan.stripePriceEnvKey], ...plan.legacyStripePriceEnvKeys.map((key) => process.env[key])]
      .filter((candidate): candidate is string => typeof candidate === 'string')
      .map((candidate) => candidate.trim())
      .filter(Boolean);

    if (configuredPriceIds.includes(normalizedPriceId)) {
      return plan.id;
    }
  }

  return undefined;
}
