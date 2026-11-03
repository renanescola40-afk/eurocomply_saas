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
