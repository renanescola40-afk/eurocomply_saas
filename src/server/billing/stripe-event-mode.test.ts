import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getStripeEventModeFromSecretKey,
  validateStripeSubscriptionPriceAuthority,
  validateStripeWebhookEventMode,
} from './stripe-event-mode';

const ORIGINAL_ESSENTIAL_PRICE = process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
const ORIGINAL_PROFESSIONAL_PRICE = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;

function subscriptionEvent(input: {
  livemode?: boolean;
  type?: string;
  priceId?: string | null;
  priceIds?: Array<string | null>;
  metadataPlan?: string | null;
}) {
  const ids = input.priceIds ?? [input.priceId === undefined ? 'price_essential_live' : input.priceId];
  const items = ids.map((priceId) => ({
    price: priceId === null ? undefined : { id: priceId },
  }));

  return {
    livemode: input.livemode ?? true,
    type: input.type ?? 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_123',
        metadata: input.metadataPlan === null ? {} : { plan: input.metadataPlan ?? 'starter' },
        items: { data: items },
      },
    },
  } as never;
}

describe('Stripe webhook event mode binding', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = 'price_essential_live';
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professional_live';
  });

  afterEach(() => {
    if (ORIGINAL_ESSENTIAL_PRICE === undefined) delete process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
    else process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY = ORIGINAL_ESSENTIAL_PRICE;

    if (ORIGINAL_PROFESSIONAL_PRICE === undefined) delete process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
    else process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = ORIGINAL_PROFESSIONAL_PRICE;
  });

  it('derives test and live mode from provider secret keys', () => {
    expect(getStripeEventModeFromSecretKey('sk_test_fixture', 'production')).toBe('test');
    expect(getStripeEventModeFromSecretKey('sk_live_fixture', 'production')).toBe('live');
    expect(getStripeEventModeFromSecretKey('rk_test_fixture', 'production')).toBe('test');
    expect(getStripeEventModeFromSecretKey('rk_live_fixture', 'production')).toBe('live');
  });

  it('fails closed when provider mode cannot be derived in production', () => {
    expect(getStripeEventModeFromSecretKey('sk_unknown', 'production')).toBeNull();
    expect(validateStripeWebhookEventMode({ livemode: false }, 'sk_unknown')).toEqual({
      ok: false,
      expectedMode: null,
      actualMode: 'test',
      reason: 'secret_key_mode_unknown',
    });
  });

  it('accepts only webhook events matching the configured provider mode', () => {
    expect(validateStripeWebhookEventMode({ livemode: false }, 'sk_test_fixture').ok).toBe(true);
    expect(validateStripeWebhookEventMode({ livemode: true }, 'sk_live_fixture').ok).toBe(true);

    expect(validateStripeWebhookEventMode({ livemode: false }, 'sk_live_fixture')).toEqual({
      ok: false,
      expectedMode: 'live',
      actualMode: 'test',
      reason: 'event_mode_mismatch',
    });
    expect(validateStripeWebhookEventMode({ livemode: true }, 'sk_test_fixture')).toEqual({
      ok: false,
      expectedMode: 'test',
      actualMode: 'live',
      reason: 'event_mode_mismatch',
    });
  });

  it('accepts a Live subscription only when its base Stripe Price is server allowlisted', () => {
    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({}))).toMatchObject({
      ok: true,
      reason: 'allowlisted_price',
      priceId: 'price_essential_live',
      plan: 'starter',
      metadataPlan: 'starter',
    });

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ priceId: 'price_attacker' }))).toMatchObject({
      ok: false,
      reason: 'subscription_price_not_allowlisted',
      priceId: 'price_attacker',
      plan: null,
    });
  });

  it('accepts an active add-on item regardless of Stripe item ordering', () => {
    const activeFriaPrice = 'price_1UE354Gt3cgjPOtqUMRXYSkx';

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({
      priceIds: [activeFriaPrice, 'price_essential_live'],
    }))).toMatchObject({
      ok: true,
      reason: 'allowlisted_price',
      priceId: 'price_essential_live',
      plan: 'starter',
    });
  });

  it('rejects preview or unknown add-on items even when the base plan is valid', () => {
    const previewExtraUserPrice = 'price_1UE374Gt3cgjPOtq24EEXT30';

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({
      priceIds: ['price_essential_live', previewExtraUserPrice],
    }))).toMatchObject({
      ok: false,
      reason: 'subscription_add_on_price_not_allowlisted',
      priceId: previewExtraUserPrice,
      plan: 'starter',
    });

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({
      priceIds: ['price_essential_live', 'price_attacker_addon'],
    }))).toMatchObject({
      ok: false,
      reason: 'subscription_add_on_price_not_allowlisted',
      priceId: 'price_attacker_addon',
      plan: 'starter',
    });
  });

  it('rejects multiple base plan prices in one self-service subscription', () => {
    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({
      priceIds: ['price_essential_live', 'price_professional_live'],
    }))).toMatchObject({
      ok: false,
      reason: 'subscription_multiple_base_prices',
    });
  });

  it('rejects missing prices and metadata that contradicts the allowlisted price', () => {
    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ priceId: null }))).toMatchObject({
      ok: false,
      reason: 'subscription_price_missing',
    });

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ metadataPlan: 'professional' }))).toMatchObject({
      ok: false,
      reason: 'subscription_metadata_plan_mismatch',
      plan: 'starter',
      metadataPlan: 'professional',
    });

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ metadataPlan: 'invented-plan' }))).toMatchObject({
      ok: false,
      reason: 'subscription_metadata_plan_invalid',
      plan: 'starter',
    });
  });

  it('never blocks test-mode simulations or cancellation/revocation events', () => {
    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ livemode: false, priceId: 'price_test_any' }))).toMatchObject({
      ok: true,
      reason: 'not_applicable',
    });

    expect(validateStripeSubscriptionPriceAuthority(subscriptionEvent({ type: 'customer.subscription.deleted', priceId: 'price_retired' }))).toMatchObject({
      ok: true,
      reason: 'not_applicable',
    });
  });
});
