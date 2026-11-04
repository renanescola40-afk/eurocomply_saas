// Compatibility entry point for server callers. Keep this dependency-free
// normalization shared so client components never import the server tree.
export {
  normalizePaidCheckoutPlanId,
  normalizePublicCheckoutPlanId,
  type PaidCheckoutPlan,
  type PublicCheckoutPlan,
} from '../../lib/billing/paid-checkout-plan';
