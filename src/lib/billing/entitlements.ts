import { type BillingPlanId, getBillingPlan } from './plans';

export type UsageMetric = 'users' | 'documents' | 'vendors' | 'risks';

export type PlanUsage = Partial<Record<UsageMetric, number>>;

export function getPlanLimit(planId: BillingPlanId | string | null | undefined, metric: UsageMetric) {
  if (!planId) return 0;

  const plan = getBillingPlan(planId);

  return plan?.limits[metric] ?? 0;
}

export function isWithinPlanLimit(
  planId: BillingPlanId | string | null | undefined,
  metric: UsageMetric,
  currentUsage: number,
) {
  const limit = getPlanLimit(planId, metric);

  return currentUsage < limit;
}

export function getUsagePercentage(
  planId: BillingPlanId | string | null | undefined,
  metric: UsageMetric,
  currentUsage: number,
) {
  const limit = getPlanLimit(planId, metric);

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
