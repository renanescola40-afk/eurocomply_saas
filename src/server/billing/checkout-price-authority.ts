/**
 * Runtime price authority for first-time self-serve Checkout.
 *
 * A configured Stripe Price ID is not sufficient proof of a paid, canonical
 * subscription. Validate the retrieved Stripe object before any customer or
 * subscription state is mutated. Do not infer authority from product names or
 * client-supplied plan metadata.
 */
export type CheckoutPriceAuthorityInput = {
  priceId: string;
  expectedAmountCents: number | null;
  expectedMode: 'test' | 'live' | null;
};

type CheckoutStripePrice = {
  id?: string;
  livemode?: boolean;
  active?: boolean;
  type?: string;
  currency?: string;
  unit_amount?: number | null;
  billing_scheme?: string;
  recurring?: {
    interval?: string;
    interval_count?: number;
    usage_type?: string;
  } | null;
  product?: string | {
    id?: string;
    active?: boolean;
    deleted?: boolean;
  } | null;
};

export type CheckoutPriceAuthorityResult =
  | { ok: true; reason: 'canonical_price_confirmed' }
  | { ok: false; reason: 'mode_unavailable' | 'invalid_catalog_amount' | 'price_mismatch' };

export function validateCheckoutPriceAuthority(
  price: CheckoutStripePrice | null | undefined,
  contract: CheckoutPriceAuthorityInput,
): CheckoutPriceAuthorityResult {
  if (!contract.expectedMode) return { ok: false, reason: 'mode_unavailable' };
  if (!Number.isSafeInteger(contract.expectedAmountCents) || (contract.expectedAmountCents ?? 0) <= 0) {
    return { ok: false, reason: 'invalid_catalog_amount' };
  }

  if (
    !price
    || !contract.priceId.startsWith('price_')
    || price.id !== contract.priceId
    || price.livemode !== (contract.expectedMode === 'live')
    || price.active !== true
    || price.type !== 'recurring'
    || price.currency?.toLowerCase() !== 'eur'
    || price.unit_amount !== contract.expectedAmountCents
    || price.billing_scheme !== 'per_unit'
    || price.recurring?.interval !== 'month'
    || price.recurring?.interval_count !== 1
    || price.recurring?.usage_type !== 'licensed'
    || !price.product
    || typeof price.product === 'string'
    || price.product.active !== true
    || price.product.deleted === true
  ) {
    return { ok: false, reason: 'price_mismatch' };
  }

  return { ok: true, reason: 'canonical_price_confirmed' };
}
