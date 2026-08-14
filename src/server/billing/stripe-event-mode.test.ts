import { describe, expect, it } from 'vitest';

import { getStripeEventModeFromSecretKey, validateStripeWebhookEventMode } from './stripe-event-mode';

describe('Stripe webhook event mode binding', () => {
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
});
