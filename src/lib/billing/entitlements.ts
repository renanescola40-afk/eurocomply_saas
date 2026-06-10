import { getBillingPlan, type BillingPlanId } from './plans';

export type UsageMetric = 'users' | 'documents' | 'vendors' | 'risks';

export type PlanUsage = Partial<Record<UsageMetric, number>>;

function normalizePlanForLimits(planId: BillingPlanId | string | null | undefined) {
  if (!planId) return 'starter';

  const normalized = String(planId).toLowerCase();

  if (normalized === 'enterprise') return 'enterprise';
  if (normalized === 'business') return 'business';
  if (normalized === 'professional' || normalized === 'pro' || normalized === 'growth') return 'growth';
  if (normalized === 'essential' || normalized === 'basic' || normalized === 'starter') return 'starter';

  return 'starter';
}

export function getPlanLimit(planId: BillingPlanId | string | null | undefined, metric: UsageMetric) {
  const normalizedPlanId = normalizePlanForLimits(planId);

  if (normalizedPlanId === 'enterprise') return Number.POSITIVE_INFINITY;

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
