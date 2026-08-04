import { getBillingPlan } from '@/lib/billing/plans';
import type { PlanIntent } from './activation';

/**
 * The onboarding activation ledger still stores the legacy `essential` value
 * for the canonical Starter plan. Keep that compatibility at one boundary so
 * inbound pricing, signup and checkout links do not silently fall back to a
 * trial when they contain `?plan=starter`.
 */
export function getOnboardingPlanIntent(planId: string | null | undefined): PlanIntent | null {
  const billingPlan = getBillingPlan(planId);
  if (!billingPlan) return null;

  return billingPlan.id === 'starter' ? 'essential' : billingPlan.id;
}
