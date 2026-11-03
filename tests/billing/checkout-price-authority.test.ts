import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { checkoutStripeModeMatchesPurpose, reusableCheckoutLineItemsMatch, validateCheckoutPriceAuthority } from '@/server/billing/checkout-price-authority';

const contract = { priceId: 'price_professional', expectedAmountCents: 14900, expectedMode: 'test' } as const;
const canonical = {
  id: contract.priceId,
  livemode: false,
  active: true,
  type: 'recurring',
  currency: 'eur',
  unit_amount: 14900,
  billing_scheme: 'per_unit',
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
  product: { id: 'prod_professional', active: true },
};

describe('self-serve Checkout Price runtime authority', () => {
  it('accepts the canonical Professional Price', () => {
    expect(validateCheckoutPriceAuthority(canonical, contract).ok).toBe(true);
  });

  it('rejects an active zero-Euro Professional TEST Price and a LIVE/TEST mismatch', () => {
    expect(validateCheckoutPriceAuthority({ ...canonical, unit_amount: 0 }, contract).ok).toBe(false);
    expect(validateCheckoutPriceAuthority({ ...canonical, livemode: true }, contract).ok).toBe(false);
  });

  it('fails closed when a Price or product is inactive or the billing interval differs', () => {
    expect(validateCheckoutPriceAuthority({ ...canonical, active: false }, contract).ok).toBe(false);
    expect(validateCheckoutPriceAuthority({ ...canonical, product: { active: false } }, contract).ok).toBe(false);
    expect(validateCheckoutPriceAuthority({
      ...canonical, recurring: { ...canonical.recurring, interval: 'year' },
    }, contract).ok).toBe(false);
  });

  it('validates an exact annual recurring Price without allowing monthly pricing', () => {
    const annual = { ...canonical, unit_amount: 149000, recurring: { ...canonical.recurring, interval: 'year' } };
    expect(validateCheckoutPriceAuthority(annual, {
      ...contract, expectedInterval: 'year', expectedAmountCents: 149000,
    }).ok).toBe(true);
    expect(validateCheckoutPriceAuthority(annual, {
      ...contract, expectedInterval: 'month', expectedAmountCents: 149000,
    }).ok).toBe(false);
  });

  it('validates self-serve lifecycle Price before claiming a durable mutation or updating Stripe', async () => {
    const lifecycle = await readFile(new URL('../../src/server/billing/subscription-lifecycle.ts', import.meta.url), 'utf8');
    const validate = lifecycle.indexOf('const lifecyclePriceAuthority = validateCheckoutPriceAuthority');
    const claim = lifecycle.indexOf('const claim = await claimBillingLifecycleRequest({');
    const update = lifecycle.indexOf('updated = await stripe.subscriptions.update(');
    expect(validate).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(validate);
    expect(update).toBeGreaterThan(claim);
    expect(lifecycle).toContain("input.action !== 'cancel' && input.action !== 'reactivate'");
    expect(lifecycle).toContain("billing_price_configuration_invalid");
  });

  it('fails closed when a reused Checkout Session contains stale or multiple line items', () => {
    const expectedPrice = 'price_professional';
    const correct = { price: { id: expectedPrice }, quantity: 1 };
    expect(reusableCheckoutLineItemsMatch({ data: [correct], has_more: false }, expectedPrice)).toBe(true);
    expect(reusableCheckoutLineItemsMatch({ data: [{ ...correct, quantity: 2 }], has_more: false }, expectedPrice)).toBe(false);
    expect(reusableCheckoutLineItemsMatch({ data: [correct, correct], has_more: false }, expectedPrice)).toBe(false);
    expect(reusableCheckoutLineItemsMatch({ data: [correct], has_more: true }, expectedPrice)).toBe(false);
    expect(reusableCheckoutLineItemsMatch({ data: [{ price: { id: 'price_wrong' }, quantity: 1 }], has_more: false }, expectedPrice)).toBe(false);
  });

  it('checks canonical Price before claiming a lease and line items before reusing a session URL', async () => {
    const source = await readFile(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
    const verify = source.indexOf('const priceAuthority = validateCheckoutPriceAuthority');
    const claim = source.indexOf('let checkoutAttempt = await claimInitialCheckoutAttempt');
    const lineItems = source.indexOf('stripe.checkout.sessions.listLineItems(existingSession.id');
    const reuseGuard = source.indexOf('reusableCheckoutLineItemsMatch(lineItems, priceId)');
    const reuse = source.indexOf('singleflightReused: true');
    expect(verify).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(verify);
    expect(lineItems).toBeGreaterThan(claim);
    expect(reuseGuard).toBeGreaterThan(lineItems);
    expect(reuse).toBeGreaterThan(reuseGuard);
    expect(source).toContain("checkout_session_requires_restart");
  });

  it('requires confirmed expiry before releasing any stale reused session', async () => {
    const source = await readFile(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
    expect(source).toContain("expired.status !== 'expired'");
    expect(source).toContain("providerCode: 'checkout_session_expiry_unconfirmed'");

    const staleLegalExpiry = source.indexOf(
      "expireReusedCheckoutSessionStrict(stripe, existingSession.id, 'billing_checkout_stale_legal_session_expire')",
    );
    const staleLegalRelease = source.indexOf(
      "releaseCheckoutAttemptSafely(organization.id, checkoutAttempt.attemptToken, 'billing_checkout_stale_legal_session_release')",
    );
    const stalePriceExpiry = source.indexOf(
      "expireReusedCheckoutSessionStrict(stripe, existingSession.id, 'checkout_stale_price_session_expire')",
    );
    const stalePriceRelease = source.indexOf("'billing_checkout_stale_price_session_release'");
    expect(staleLegalExpiry).toBeGreaterThan(-1);
    expect(staleLegalRelease).toBeGreaterThan(staleLegalExpiry);
    expect(stalePriceExpiry).toBeGreaterThan(-1);
    expect(stalePriceRelease).toBeGreaterThan(stalePriceExpiry);
  });

  it('keeps TEST-only validation and LIVE-only paid Checkout modes separate', async () => {
    expect(checkoutStripeModeMatchesPurpose('test', true)).toBe(true);
    expect(checkoutStripeModeMatchesPurpose('live', false)).toBe(true);
    expect(checkoutStripeModeMatchesPurpose('live', true)).toBe(false);
    expect(checkoutStripeModeMatchesPurpose('test', false)).toBe(false);
    expect(checkoutStripeModeMatchesPurpose(null, false)).toBe(false);
    const source = await readFile(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
    const modeCheck = source.indexOf('checkoutStripeModeMatchesPurpose(expectedStripeMode, validationOnlyCheckout)');
    const stripeClient = source.indexOf('const stripe = getStripeClient()');
    const checkoutClaim = source.indexOf('let checkoutAttempt = await claimInitialCheckoutAttempt');
    expect(modeCheck).toBeGreaterThan(-1);
    expect(stripeClient).toBeGreaterThan(modeCheck);
    expect(checkoutClaim).toBeGreaterThan(stripeClient);
  });

  it('verifies the Stripe Price before the first customer side effect', async () => {
    const source = await readFile(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
    const authority = source.indexOf('const priceAuthority = validateCheckoutPriceAuthority');
    const customer = source.indexOf('const customer = await ensureOrganizationStripeCustomer');
    const session = source.indexOf('stripe.checkout.sessions.create(');

    expect(authority).toBeGreaterThan(-1);
    expect(customer).toBeGreaterThan(authority);
    expect(session).toBeGreaterThan(authority);
    expect(source).toContain("providerCode: 'checkout_price_authority_invalid'");
  });
});
