import type { SubscriptionPlan } from '@/server/queries/subscription';

export type BillingPlanId = SubscriptionPlan;

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceMonthly: number;
  stripePriceEnvKey: string;
  limits: {
    users: number;
    documents: number;
    vendors: number;
    risks: number;
  };
  features: string[];
};

const BILLING_PLAN_IDS: BillingPlanId[] = ['essential', 'professional', 'business', 'enterprise'];

const BILLING_PLAN_ALIASES: Record<string, BillingPlanId> = {
  starter: 'essential',
  basic: 'essential',
  free: 'essential',
  growth: 'professional',
  pro: 'professional',
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'essential',
    name: 'Essential',
    priceMonthly: 49,
    stripePriceEnvKey: 'STRIPE_PRICE_ESSENTIAL_MONTHLY',
    limits: { users: 3, documents: 40, vendors: 15, risks: 30 },
    features: ['Executive dashboard', 'Compliance templates', 'Document register', 'Basic risk tracking', 'CSV exports'],
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 149,
    stripePriceEnvKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    limits: { users: 12, documents: 200, vendors: 75, risks: 150 },
    features: ['Vendor management', 'Risk register', 'Board-ready reports', 'Template-to-document', 'Email alerts'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 399,
    stripePriceEnvKey: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    limits: { users: 50, documents: 1000, vendors: 300, risks: 750 },
    features: ['Advanced audit logs', 'Executive reporting', 'Priority support', 'Compliance timeline', 'Production observability'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 990,
    stripePriceEnvKey: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    limits: { users: 250, documents: 10000, vendors: 2500, risks: 5000 },
    features: [
      'All Business features',
      'Premium intelligence journal',
      'AI governance pro workflows',
      'Evidence and audit pack',
      'Enterprise readiness exports',
      'Advanced vendor assurance',
      'Priority implementation support',
      'Expanded monthly credits',
    ],
  },
];

export function normalizeBillingPlanId(planId: string | null | undefined): BillingPlanId | undefined {
  const normalized = planId?.toLowerCase().trim();

  if (!normalized) return undefined;
  if (BILLING_PLAN_IDS.includes(normalized as BillingPlanId)) return normalized as BillingPlanId;

  return BILLING_PLAN_ALIASES[normalized];
}

export function getBillingPlan(planId: string | null | undefined) {
  const normalizedPlanId = normalizeBillingPlanId(planId);

  return BILLING_PLANS.find((plan) => plan.id === normalizedPlanId);
}

export function getStripePriceId(plan: BillingPlan) {
  return process.env[plan.stripePriceEnvKey];
}
