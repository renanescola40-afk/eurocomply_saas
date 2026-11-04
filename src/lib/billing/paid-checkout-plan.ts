/**
 * Paid Checkout has a narrower trust boundary than historical plan reads.
 * 'free' and 'basic' may be legacy data aliases, but must never be accepted as
 * client-supplied identifiers that cause a €49 paid Essential subscription.
 */
export type PaidCheckoutPlan = 'starter' | 'professional';

export function normalizePaidCheckoutPlanId(value: unknown): PaidCheckoutPlan | undefined {
  if (typeof value !== 'string') return undefined;
  switch (value.trim().toLowerCase()) {
    case 'starter':
    case 'essential':
      return 'starter';
    case 'professional':
    case 'growth':
    case 'pro':
      return 'professional';
    default:
      return undefined;
  }
}

/**
 * Public checkout discovery may include sales-led Business/Enterprise plans,
 * whereas paid self-service mutations use normalizePaidCheckoutPlanId only.
 * Never interpret historical free/basic persisted aliases as paid plans in a
 * customer-supplied URL or API request.
 */
export type PublicCheckoutPlan = PaidCheckoutPlan | 'business' | 'enterprise';

export function normalizePublicCheckoutPlanId(value: unknown): PublicCheckoutPlan | undefined {
  const paid = normalizePaidCheckoutPlanId(value);
  if (paid) return paid;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'business' || normalized === 'enterprise') return normalized;
  return undefined;
}

