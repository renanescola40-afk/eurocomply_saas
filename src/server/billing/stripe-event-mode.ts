import Stripe from 'stripe';

export type StripeEventMode = 'live' | 'test';

export type StripeEventModeValidation = {
  ok: boolean;
  expectedMode: StripeEventMode | null;
  actualMode: StripeEventMode;
  reason: 'matched' | 'secret_key_mode_unknown' | 'event_mode_mismatch';
};

export function getStripeEventModeFromSecretKey(
  secretKey = process.env.STRIPE_SECRET_KEY,
  nodeEnv = process.env.NODE_ENV,
): StripeEventMode | null {
  const value = String(secretKey ?? '').trim();
  if (value.startsWith('sk_live_') || value.startsWith('rk_live_')) return 'live';
  if (value.startsWith('sk_test_') || value.startsWith('rk_test_')) return 'test';

  // Unit tests mock Stripe before a provider key exists. Production never gets this fallback.
  if (!value && nodeEnv === 'test') return 'test';
  return null;
}

export function validateStripeWebhookEventMode(
  event: Pick<Stripe.Event, 'livemode'>,
  secretKey = process.env.STRIPE_SECRET_KEY,
): StripeEventModeValidation {
  const expectedMode = getStripeEventModeFromSecretKey(secretKey);
  const actualMode: StripeEventMode = event.livemode ? 'live' : 'test';

  if (!expectedMode) {
    return { ok: false, expectedMode: null, actualMode, reason: 'secret_key_mode_unknown' };
  }

  if (expectedMode !== actualMode) {
    return { ok: false, expectedMode, actualMode, reason: 'event_mode_mismatch' };
  }

  return { ok: true, expectedMode, actualMode, reason: 'matched' };
}
