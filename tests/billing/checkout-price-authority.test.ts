import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { validateCheckoutPriceAuthority } from '@/server/billing/checkout-price-authority';

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
