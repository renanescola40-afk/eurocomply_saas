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
    priceMonthly: 29,
    stripePriceEnvKey: 'STRIPE_STARTER_PRICE_ID',
    limits: { users: 3, documents: 25, vendors: 10, risks: 25 },
    features: ['GDPR checklist', 'Document register', 'Basic risk tracking'],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 79,
    stripePriceEnvKey: 'STRIPE_GROWTH_PRICE_ID',
    limits: { users: 10, documents: 100, vendors: 50, risks: 100 },
    features: ['Vendor management', 'Risk register', 'Audit evidence reports'],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 199,
    stripePriceEnvKey: 'STRIPE_BUSINESS_PRICE_ID',
    limits: { users: 50, documents: 500, vendors: 250, risks: 500 },
    features: ['Advanced audit logs', 'Executive reporting', 'Priority support'],
  },
];

export function getBillingPlan(planId: string) {
  return BILLING_PLANS.find((plan) => plan.id === planId);
}

export function getStripePriceId(plan: BillingPlan) {
  return process.env[plan.stripePriceEnvKey];
}
