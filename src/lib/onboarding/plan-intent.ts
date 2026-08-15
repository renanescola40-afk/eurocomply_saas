import { getBillingPlan } from '@/lib/billing/plans';
import type { PlanIntent } from './activation';

export const DEFAULT_ONBOARDING_PLAN_INTENT: PlanIntent = 'professional';

/**
 * The onboarding activation ledger still stores the legacy `essential` value
 * for the canonical Starter plan. Keep that compatibility at one boundary so
 * inbound pricing, signup and checkout links stay aligned with the catalog.
 *
 * When no valid commercial plan is supplied, use Professional: this matches
 * the checkout fallback and prevents the onboarding UI from silently reviving
 * the retired public `trial` intent.
 */
export function getOnboardingPlanIntent(planId: string | null | undefined): PlanIntent {
  const billingPlan = getBillingPlan(planId);
  if (!billingPlan) return DEFAULT_ONBOARDING_PLAN_INTENT;

  return billingPlan.id === 'starter' ? 'essential' : billingPlan.id;
}
