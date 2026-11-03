/**
 * Runtime price authority for first-time self-serve Checkout.
 *
 * A configured Stripe Price ID is not sufficient proof of a paid, canonical
 * subscription. Validate the retrieved Stripe object before any customer or
 * subscription state is mutated. Do not infer authority from product names or
 * client-supplied plan metadata.
 */
/** Validation-only checkout must stay in Stripe TEST. A customer-facing paid
 * checkout may use only Stripe LIVE; never silently downgrade its mode. */
export function checkoutStripeModeMatchesPurpose(
  expectedMode: 'test' | 'live' | null,
  validationOnlyCheckout: boolean,
): boolean {
  return expectedMode === (validationOnlyCheckout ? 'test' : 'live');
}

export type CheckoutPriceAuthorityInput = {
  priceId: string;
  expectedAmountCents: number | null;
  expectedMode: 'test' | 'live' | null;
  expectedInterval?: 'month' | 'year';
};

type CheckoutStripePrice = Record<string, unknown>;

type CheckoutStripeRecurring = Record<string, unknown>;

type CheckoutStripeProduct = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* Stripe's SDK models an expanded Product as Product | DeletedProduct and
 * exactOptionalPropertyTypes makes that union incompatible with a hand-written
 * narrower Product shape. Treat provider payload fields as unknown and validate
 * each required field here so the compile-time bridge does not weaken runtime authority.
 */
type CheckoutStripePricePayload = unknown;

export type CheckoutPriceAuthorityResult =
  | { ok: true; reason: 'canonical_price_confirmed' }
  | { ok: false; reason: 'mode_unavailable' | 'invalid_catalog_amount' | 'price_mismatch' };

export function validateCheckoutPriceAuthority(
  price: unknown,
  contract: CheckoutPriceAuthorityInput,
): CheckoutPriceAuthorityResult {
  if (!contract.expectedMode) return { ok: false, reason: 'mode_unavailable' };
  if (!Number.isSafeInteger(contract.expectedAmountCents) || (contract.expectedAmountCents ?? 0) <= 0) {
    return { ok: false, reason: 'invalid_catalog_amount' };
  }

  const priceRecord = isRecord(price) ? price : null;
  const recurring = priceRecord && isRecord(priceRecord.recurring) ? priceRecord.recurring : null;
  const product = priceRecord && isRecord(priceRecord.product) ? priceRecord.product : null;

  if (
    !priceRecord
    || !contract.priceId.startsWith('price_')
    || priceRecord.id !== contract.priceId
    || priceRecord.livemode !== (contract.expectedMode === 'live')
    || priceRecord.active !== true
    || priceRecord.type !== 'recurring'
    || typeof priceRecord.currency !== 'string'
    || priceRecord.currency.toLowerCase() !== 'eur'
    || priceRecord.unit_amount !== contract.expectedAmountCents
    || priceRecord.billing_scheme !== 'per_unit'
    || !recurring
    || recurring.interval !== (contract.expectedInterval ?? 'month')
    || recurring.interval_count !== 1
    || recurring.usage_type !== 'licensed'
    || !product
    || product.active !== true
    || product.deleted === true
  ) {
    return { ok: false, reason: 'price_mismatch' };
  }

  return { ok: true, reason: 'canonical_price_confirmed' };
}


/** A reused hosted Session is safe only if it still contains exactly one
 * canonical base-plan Price with one licensed seat and no additional items. */
export function reusableCheckoutLineItemsMatch(
  items: {
    data: Array<{ price?: { id?: string | null } | null; quantity?: number | null }>;
    has_more: boolean;
  },
  expectedPriceId: string,
): boolean {
  return expectedPriceId.startsWith('price_')
    && items.has_more === false
    && items.data.length === 1
    && items.data[0]?.price?.id === expectedPriceId
    && items.data[0]?.quantity === 1;
}
