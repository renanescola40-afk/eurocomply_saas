import type { CanonicalSubscriptionPlan, LegacySubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlanId = CanonicalSubscriptionPlan | LegacySubscriptionPlan;
type CatalogBillingPlanId = CanonicalSubscriptionPlan;

export type BillingLimit = number | 'unlimited';

export type BillingEntitlements = {
  // Keep the legacy dashboard/checkout capacity fields numeric. Existing UI
  // formatters and usage guards consume these directly as numbers.
  users: number;
  documents: number;
  vendors: number;
  risks: number;
  organizations: BillingLimit;
  aiSystems: BillingLimit;
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
  startingPriceMonthly?: number | null;
  annualDiscountPercent: number | null;
  salesLed: boolean;
  stripePriceEnvKeyMonthly?: string;
  stripePriceEnvKeyAnnual?: string;
  legacyStripePriceEnvKeysMonthly: string[];
  legacyStripePriceEnvKeysAnnual: string[];
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
    name: 'Essential',
    priceMonthly: 49,
    priceAnnual: 490,
    startingPriceMonthly: 49,
    annualDiscountPercent: 17,
    salesLed: false,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_ESSENTIAL_ANNUAL',
    legacyStripePriceEnvKeysMonthly: ['STRIPE_PRICE_STARTER_MONTHLY'],
    legacyStripePriceEnvKeysAnnual: ['STRIPE_PRICE_STARTER_ANNUAL'],
    limits: { users: 3, documents: 100, vendors: 0, risks: 0, organizations: 1, aiSystems: 25, storageGb: 10, apiRequestsMonthly: 0, webhooks: 0, exportsMonthly: 25, auditLogsDays: 30 },
    features: ['AI Inventory', 'Risk Classification', 'Dashboard', 'PDF Export', 'Basic audit', 'Email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 149,
    priceAnnual: 1490,
    startingPriceMonthly: 149,
    annualDiscountPercent: 17,
    salesLed: false,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
    legacyStripePriceEnvKeysMonthly: ['STRIPE_PRICE_GROWTH_MONTHLY'],
    legacyStripePriceEnvKeysAnnual: ['STRIPE_PRICE_GROWTH_ANNUAL'],
    // API credentials and outbound webhook subscriptions currently use the
    // Enterprise integration authority (platform-provisioned credential + active
    // Enterprise contract). Do not advertise self-service capacity before that
    // provisioning chain exists for Professional customers.
    limits: { users: 15, documents: 1000, vendors: 30, risks: 75, organizations: 1, aiSystems: 250, storageGb: 100, apiRequestsMonthly: 0, webhooks: 0, exportsMonthly: 500, auditLogsDays: 180 },
    features: ['Risk Register', 'Tasks', 'Reports', 'Regulatory Monitoring', 'Vendor Register', 'FRIA', 'Annex IV Assistant', 'Branding'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 399,
    priceAnnual: 3990,
    startingPriceMonthly: 399,
    annualDiscountPercent: 17,
    salesLed: true,
    stripePriceEnvKeyMonthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    stripePriceEnvKeyAnnual: 'STRIPE_PRICE_BUSINESS_ANNUAL',
    legacyStripePriceEnvKeysMonthly: [],
    legacyStripePriceEnvKeysAnnual: [],
    // Billing authority is organization-scoped today: one subscription/contract
    // licenses one organization. A future multi-organization billing account must
    // be explicit rather than inferred from creator identity or shared customer ID.
    limits: { users: 75, documents: 10000, vendors: 150, risks: 300, organizations: 1, aiSystems: 1500, storageGb: 500, apiRequestsMonthly: 0, webhooks: 0, exportsMonthly: 5000, auditLogsDays: 730 },
    features: ['AI Literacy', 'Procurement', 'QMS', 'Approval Workflows', 'Advanced Reporting', 'Priority Support', 'Integrations', 'Departments', 'Environments'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    startingPriceMonthly: 990,
    annualDiscountPercent: null,
    salesLed: true,
    legacyStripePriceEnvKeysMonthly: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'],
    legacyStripePriceEnvKeysAnnual: ['STRIPE_PRICE_ENTERPRISE_ANNUAL'],
    limits: { users: Number.MAX_SAFE_INTEGER, documents: Number.MAX_SAFE_INTEGER, vendors: Number.MAX_SAFE_INTEGER, risks: Number.MAX_SAFE_INTEGER, organizations: 'unlimited', aiSystems: 'unlimited', storageGb: 'unlimited', apiRequestsMonthly: 'unlimited', webhooks: 'unlimited', exportsMonthly: 'unlimited', auditLogsDays: 3650 },
    features: ['API', 'Webhooks', 'SSO', 'SCIM', 'Azure AD', 'Okta', 'Google Workspace', 'Advanced RBAC', 'Custom roles', 'Custom workflows', 'Enterprise SLA', 'Dedicated onboarding', 'Customer success', 'Priority roadmap'],
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
  const primaryPriceId = primaryKey ? process.env[primaryKey]?.trim() : undefined;

  // Public self-serve catalog helpers must never silently resolve legacy
  // Starter/Growth prices. Existing legacy subscription reconciliation is
  // handled separately by getBillingPlanIdForStripePriceId below.
  if (!plan.salesLed) return primaryPriceId;

  const legacyKeys = interval === 'year' ? plan.legacyStripePriceEnvKeysAnnual : plan.legacyStripePriceEnvKeysMonthly;
  const legacyPriceId = legacyKeys.map((key) => process.env[key]?.trim()).find(Boolean);
  return primaryPriceId || legacyPriceId;
}

export function getBillingPlanIdForStripePriceId(priceId: string | null | undefined): CatalogBillingPlanId | undefined {
  const normalizedPriceId = priceId?.trim();
  if (!normalizedPriceId) return undefined;

  for (const plan of BILLING_PLANS) {
    const envKeys = [
      plan.stripePriceEnvKeyMonthly,
      plan.stripePriceEnvKeyAnnual,
      ...plan.legacyStripePriceEnvKeysMonthly,
      ...plan.legacyStripePriceEnvKeysAnnual,
    ].filter((key): key is string => Boolean(key));
    const configuredPriceIds = envKeys.map((key) => process.env[key]).filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
    if (configuredPriceIds.includes(normalizedPriceId)) return plan.id;
  }

  return undefined;
}
