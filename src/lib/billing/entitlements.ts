import { getBillingPlan, type BillingPlanId } from './plans';

export type UsageMetric = 'users' | 'documents' | 'vendors' | 'risks';

export type PlanUsage = Partial<Record<UsageMetric, number>>;

function resolvePlanForLimits(planId: BillingPlanId | string | null | undefined) {
  return getBillingPlan(planId ?? 'starter') ?? getBillingPlan('starter');
}

export function getPlanLimit(planId: BillingPlanId | string | null | undefined, metric: UsageMetric) {
  const plan = resolvePlanForLimits(planId);
  if (!plan) return 0;
  if (plan.id === 'enterprise') return Number.POSITIVE_INFINITY;

  return plan.limits[metric] ?? 0;
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
