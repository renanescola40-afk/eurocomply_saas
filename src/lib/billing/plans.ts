export type BillingPlanId = 'starter' | 'growth' | 'business';

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

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    stripePriceEnvKey: 'STRIPE_STARTER_PRICE_ID',
    limits: { users: 3, documents: 40, vendors: 15, risks: 30 },
    features: ['Executive dashboard', 'Compliance templates', 'Document register', 'Basic risk tracking', 'CSV exports'],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 149,
    stripePriceEnvKey: 'STRIPE_GROWTH_PRICE_ID',
    limits: { users: 12, documents: 200, vendors: 75, risks: 150 },
    features: ['Vendor management', 'Risk register', 'Board-ready reports', 'Template-to-document', 'Email alerts'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 399,
    stripePriceEnvKey: 'STRIPE_BUSINESS_PRICE_ID',
    limits: { users: 50, documents: 1000, vendors: 300, risks: 750 },
    features: ['Advanced audit logs', 'Executive reporting', 'Priority support', 'Compliance timeline', 'Production observability'],
  },
];

export function getBillingPlan(planId: string) {
  return BILLING_PLANS.find((plan) => plan.id === planId);
}

export function getStripePriceId(plan: BillingPlan) {
  return process.env[plan.stripePriceEnvKey];
}
