/**
 * A lifecycle mutation must use the base plan proven by Stripe's allowlisted
 * subscription item Price. A local or provider metadata label is a consistency
 * check, never authority to infer or upgrade a paid plan.
 *
 * The caller normalizes historical stored labels with normalizeBillingPlanId,
 * then passes both the original presence and the normalized canonical value.
 */
export type SubscriptionCanonicalPlan = 'starter' | 'professional' | 'business' | 'enterprise';

export type SubscriptionPlanEvidence = {
  raw: string | null | undefined;
  normalized: SubscriptionCanonicalPlan | undefined;
};

export function resolveSubscriptionCurrentPlan(
  providerPricePlan: SubscriptionCanonicalPlan | null | undefined,
  metadataSources: readonly SubscriptionPlanEvidence[],
): SubscriptionCanonicalPlan | undefined {
  if (!providerPricePlan) return undefined;
  for (const source of metadataSources) {
    if (source.raw != null && source.normalized !== providerPricePlan) return undefined;
  }
  return providerPricePlan;
}
