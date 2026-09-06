import Stripe from 'stripe';

import {
  getBillingPlanIdForStripePriceId,
  normalizeBillingCatalogPlanId,
} from '@/lib/billing/plans';

export type StripeEventMode = 'live' | 'test';

export type StripeEventModeValidation = {
  ok: boolean;
  expectedMode: StripeEventMode | null;
  actualMode: StripeEventMode;
  reason: 'matched' | 'secret_key_mode_unknown' | 'event_mode_mismatch';
};

export type StripeSubscriptionPriceAuthorityValidation = {
  ok: boolean;
  reason:
    | 'not_applicable'
    | 'allowlisted_price'
    | 'subscription_price_missing'
    | 'subscription_price_not_allowlisted'
    | 'subscription_metadata_plan_invalid'
    | 'subscription_metadata_plan_mismatch';
  priceId: string | null;
  plan: string | null;
  metadataPlan: string | null;
};

type SubscriptionWithPrice = Stripe.Subscription & {
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
    }>;
  };
};

function getSubscriptionPriceId(subscription: SubscriptionWithPrice) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return typeof priceId === 'string' && priceId.trim() ? priceId.trim() : null;
}

function getMetadataPlan(subscription: SubscriptionWithPrice) {
  const metadata = subscription.metadata;
  for (const key of ['plan', 'plan_id', 'planId']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

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

/**
 * Live self-service subscription authority must come from a server-configured,
 * allowlisted Stripe Price. Subscription metadata is context only and may never
 * select a commercial plan by itself.
 *
 * Test-mode events are intentionally not blocked here because they never satisfy
 * the Production commercial-authority ledger. Deletion/cancellation events are
 * also excluded so revocation can never be prevented by a stale price mapping.
 */
export function validateStripeSubscriptionPriceAuthority(
  event: Pick<Stripe.Event, 'type' | 'livemode' | 'data'>,
): StripeSubscriptionPriceAuthorityValidation {
  if (
    !event.livemode
    || (event.type !== 'customer.subscription.created' && event.type !== 'customer.subscription.updated')
  ) {
    return {
      ok: true,
      reason: 'not_applicable',
      priceId: null,
      plan: null,
      metadataPlan: null,
    };
  }

  const subscription = event.data.object as SubscriptionWithPrice;
  const priceId = getSubscriptionPriceId(subscription);
  const rawMetadataPlan = getMetadataPlan(subscription);
  const metadataPlan = rawMetadataPlan ? normalizeBillingCatalogPlanId(rawMetadataPlan) ?? null : null;

  if (!priceId) {
    return {
      ok: false,
      reason: 'subscription_price_missing',
      priceId: null,
      plan: null,
      metadataPlan,
    };
  }

  const plan = getBillingPlanIdForStripePriceId(priceId) ?? null;
  if (!plan) {
    return {
      ok: false,
      reason: 'subscription_price_not_allowlisted',
      priceId,
      plan: null,
      metadataPlan,
    };
  }

  if (rawMetadataPlan && !metadataPlan) {
    return {
      ok: false,
      reason: 'subscription_metadata_plan_invalid',
      priceId,
      plan,
      metadataPlan: null,
    };
  }

  if (metadataPlan && metadataPlan !== plan) {
    return {
      ok: false,
      reason: 'subscription_metadata_plan_mismatch',
      priceId,
      plan,
      metadataPlan,
    };
  }

  return {
    ok: true,
    reason: 'allowlisted_price',
    priceId,
    plan,
    metadataPlan,
  };
}
