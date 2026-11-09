/**
 * Resolve a Stripe Price to exactly one canonical plan. A misconfigured
 * Price ID shared by different plan tiers cannot be used as billing authority.
 * Repeated canonical/legacy aliases within the same plan are not ambiguous.
 */
export type CanonicalStripePlan = 'starter' | 'professional' | 'business' | 'enterprise';
export type ConfiguredStripePlanPrices = {
  planId: CanonicalStripePlan;
  priceIds: readonly string[];
};

export function resolveUniqueStripePricePlan(
  priceId: string | null | undefined,
  configuredPlans: readonly ConfiguredStripePlanPrices[],
): CanonicalStripePlan | undefined {
  const normalizedPriceId = priceId?.trim();
  if (!normalizedPriceId) return undefined;

  let found: CanonicalStripePlan | undefined;
  for (const plan of configuredPlans) {
    if (!plan.priceIds.includes(normalizedPriceId)) continue;
    if (found && found !== plan.planId) return undefined;
    found = plan.planId;
  }
  return found;
}
