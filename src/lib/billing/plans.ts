import type { CanonicalSubscriptionPlan, LegacySubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlanId = CanonicalSubscriptionPlan | LegacySubscriptionPlan;
type CatalogBillingPlanId = CanonicalSubscriptionPlan;

export type BillingLimit = number | 'unlimited';

export type BillingEntitlements = {
  users: BillingLimit;
  organizations: BillingLimit;
  aiSystems: BillingLimit;
  documents: BillingLimit;
  storageGb: BillingLimit;
  apiRequestsMonthly: BillingLimit;
  webhooks: BillingLimit;
  exportsMonthly: BillingLimit;
  auditLogsDays: BillingLimit;
};

export type BillingPlan = {
  id: CatalogBillingPlanId;
  name: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  annualDiscountPercent: number | null;
  salesLed: boolean;
  stripePriceEnvKeyMonthly?: string;
  stripePriceEnvKeyAnnual?: string;
  legacyStripePriceEnvKeys: string[];
  limits: BillingEntitlements;
  features: string[];
};

export type BillingPlanCatalog = [BillingPlan, ...BillingPlan[]];

const BILLING_PLAN_IDS: BillingPlanId[] = ['starter', 'professional', 'business', 'enterprise', 'essential', 'growth'];

const BILLING_PLAN_ALIASES: Record<string, BillingPlanId> = {
  basic: 'starter',
  free: 'starter',
  pro: 'professional',
};

const CATALOG_PLAN_BY_ID: Record<BillingPlanId, CatalogBillingPlanId> = {
  essential: 'starter',
  starter: 'starter',
  growth: 'professional',
  professional: 'professional',
  business: 'business',
  enterprise: 'enterprise',
};

export const BILLING_PLANS: BillingPlanCatalog = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    priceAnnual: 490,
    annualDiscountPercent: 17,
    salesLed: false,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_STARTER_ANNUAL',
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_ESSENTIAL_MONTHLY'],
    limits: { users: 3, organizations: 1, aiSystems: 25, documents: 100, storageGb: 10, apiRequestsMonthly: 0, webhooks: 0, exportsMonthly: 25, auditLogsDays: 30 },
    features: ['AI Inventory', 'Risk Classification', 'Dashboard', 'PDF Export', 'Basic audit', 'Email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 199,
    priceAnnual: 1990,
    annualDiscountPercent: 17,
    salesLed: false,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_GROWTH_MONTHLY'],
    limits: { users: 15, organizations: 1, aiSystems: 250, documents: 1000, storageGb: 100, apiRequestsMonthly: 10000, webhooks: 10, exportsMonthly: 500, auditLogsDays: 180 },
    features: ['Risk Register', 'Tasks', 'Reports', 'Regulatory Monitoring', 'Vendor Register', 'FRIA', 'Annex IV Assistant', 'API', 'Webhooks', 'Branding'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 699,
    priceAnnual: 6990,
    annualDiscountPercent: 17,
    salesLed: true,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_BUSINESS_ANNUAL',
    legacyStripePriceEnvKeys: [],
    limits: { users: 75, organizations: 3, aiSystems: 1500, documents: 10000, storageGb: 500, apiRequestsMonthly: 100000, webhooks: 100, exportsMonthly: 5000, auditLogsDays: 730 },
    features: ['AI Literacy', 'Procurement', 'QMS', 'Approval Workflows', 'Advanced Reporting', 'Priority Support', 'Integrations', 'Departments', 'Environments'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    annualDiscountPercent: null,
    salesLed: true,
    legacyStripePriceEnvKeys: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
    limits: { users: 'unlimited', organizations: 'unlimited', aiSystems: 'unlimited', documents: 'unlimited', storageGb: 'unlimited', apiRequestsMonthly: 'unlimited', webhooks: 'unlimited', exportsMonthly: 'unlimited', auditLogsDays: 3650 },
    features: ['SSO', 'SCIM', 'Azure AD', 'Okta', 'Google Workspace', 'Advanced RBAC', 'Custom roles', 'Custom workflows', 'Enterprise SLA', 'Dedicated onboarding', 'Customer success', 'Priority roadmap'],
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
  return getBillingPlan(planId)?.limits ?? BILLING_PLANS[0].limits;
}

export function getStripePriceId(plan: BillingPlan, interval: 'month' | 'year' = 'month') {
  const primaryKey = interval === 'year' ? plan.stripePriceEnvKeyAnnual : plan.stripePriceEnvKeyMonthly;
  return (primaryKey ? process.env[primaryKey] : undefined) ?? plan.legacyStripePriceEnvKeys.map((key) => process.env[key]).find(Boolean);
}

export function getBillingPlanIdForStripePriceId(priceId: string | null | undefined): CatalogBillingPlanId | undefined {
  const normalizedPriceId = priceId?.trim();
  if (!normalizedPriceId) return undefined;

  for (const plan of BILLING_PLANS) {
    const envKeys = [plan.stripePriceEnvKeyMonthly, plan.stripePriceEnvKeyAnnual, ...plan.legacyStripePriceEnvKeys].filter((key): key is string => Boolean(key));
    const configuredPriceIds = envKeys.map((key) => process.env[key]).filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
    if (configuredPriceIds.includes(normalizedPriceId)) return plan.id;
  }

  return undefined;
}
