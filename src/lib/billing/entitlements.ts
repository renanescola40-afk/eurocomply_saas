import { getBillingPlan, type BillingPlanId } from './plans';

export type UsageMetric = 'users' | 'documents' | 'vendors' | 'risks';

export type PlanUsage = Partial<Record<UsageMetric, number>>;

const LEGACY_LIMITS: Record<string, Partial<Record<UsageMetric, number>>> = {
  essential: { users: 1, documents: 10, vendors: 5, risks: 10 },
  professional: { users: 3, documents: 100, vendors: 30, risks: 75 },
  business: { users: 10, documents: 1000, vendors: 150, risks: 300 },
};

function normalizePlanForLimits(planId: BillingPlanId | string | null | undefined) {
  if (!planId) return 'starter';

  const normalized = String(planId).toLowerCase();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional') return 'professional';
  if (normalized === 'pro' || normalized === 'growth') return 'growth';
  if (normalized === 'essential') return 'essential';
  if (normalized === 'basic' || normalized === 'starter') return 'starter';

  return 'starter';
}

export function getPlanLimit(planId: BillingPlanId | string | null | undefined, metric: UsageMetric) {
  const normalizedPlanId = normalizePlanForLimits(planId);

  if (normalizedPlanId === 'enterprise') return Number.POSITIVE_INFINITY;

  const legacyLimit = LEGACY_LIMITS[normalizedPlanId]?.[metric];
  if (typeof legacyLimit === 'number') return legacyLimit;

  const plan = getBillingPlan(normalizedPlanId);

  return plan?.limits[metric] ?? 0;
}

export function isWithinPlanLimit(
  planId: BillingPlanId | string | null | undefined,
  metric: UsageMetric,
  currentUsage: number,
) {
  const limit = getPlanLimit(planId, metric);

  return limit === Number.POSITIVE_INFINITY || currentUsage < limit;
}

export function getUsagePercentage(
  planId: BillingPlanId | string | null | undefined,
  metric: UsageMetric,
  currentUsage: number,
) {
  const limit = getPlanLimit(planId, metric);

  if (limit === Number.POSITIVE_INFINITY) return 0;
  if (!limit) return 100;

  return Math.min(100, Math.round((currentUsage / limit) * 100));
}

export function getUpgradeReason(metric: UsageMetric) {
  const labels: Record<UsageMetric, string> = {
    users: 'team members',
    documents: 'documents',
    vendors: 'vendors',
    risks: 'risks',
  };

  return `You have reached the limit for ${labels[metric]} on your current plan.`;
}
