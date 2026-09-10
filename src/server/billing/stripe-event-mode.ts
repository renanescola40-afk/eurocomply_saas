import Stripe from 'stripe';

import { getBillingAddOn, isBillingAddOnCommerciallyActive } from '@/lib/billing/add-ons';
import {
  getBillingPlanIdForStripePriceId,
  normalizeBillingCatalogPlanId,
} from '@/lib/billing/plans';
import { getBillingAddOnSlugForStripePriceId } from '@/server/billing/add-ons';

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
    | 'subscription_add_on_price_not_allowlisted'
    | 'subscription_multiple_base_prices'
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

function getSubscriptionPriceIds(subscription: SubscriptionWithPrice) {
  return (subscription.items?.data ?? [])
    .map((item) => item.price?.id)
    .filter((priceId): priceId is string => typeof priceId === 'string' && Boolean(priceId.trim()))
    .map((priceId) => priceId.trim());
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
 * Live self-service subscription authority must come from one server-allowlisted
 * base-plan Price plus zero or more commercially-active add-on Prices. Stripe does
 * not guarantee that the base subscription item is the first item, so authority is
 * resolved across the full item set instead of trusting array order.
 *
 * Subscription metadata remains context only and may never select a plan by itself.
 * Test-mode events and deletion events remain outside this positive allowlist gate so
 * revocation can never be prevented by a stale commercial mapping.
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
  const priceIds = getSubscriptionPriceIds(subscription);
  const rawMetadataPlan = getMetadataPlan(subscription);
  const metadataPlan = rawMetadataPlan ? normalizeBillingCatalogPlanId(rawMetadataPlan) ?? null : null;

  if (!priceIds.length) {
    return {
      ok: false,
      reason: 'subscription_price_missing',
      priceId: null,
      plan: null,
      metadataPlan,
    };
  }

  const baseItems = priceIds
    .map((priceId) => ({ priceId, plan: getBillingPlanIdForStripePriceId(priceId) ?? null }))
    .filter((item): item is { priceId: string; plan: NonNullable<typeof item.plan> } => Boolean(item.plan));

  if (baseItems.length === 0) {
    return {
      ok: false,
      reason: 'subscription_price_not_allowlisted',
      priceId: priceIds[0],
      plan: null,
      metadataPlan,
    };
  }

  const distinctBasePlans = new Set(baseItems.map((item) => item.plan));
  if (baseItems.length !== 1 || distinctBasePlans.size !== 1) {
    return {
      ok: false,
      reason: 'subscription_multiple_base_prices',
      priceId: baseItems[0]?.priceId ?? null,
      plan: baseItems[0]?.plan ?? null,
      metadataPlan,
    };
  }

  const base = baseItems[0];
  const addOnPriceIds = priceIds.filter((priceId) => priceId !== base.priceId);
  for (const addOnPriceId of addOnPriceIds) {
    const slug = getBillingAddOnSlugForStripePriceId(addOnPriceId);
    const addOn = getBillingAddOn(slug);
    if (!slug || !addOn || !isBillingAddOnCommerciallyActive(addOn)) {
      return {
        ok: false,
        reason: 'subscription_add_on_price_not_allowlisted',
        priceId: addOnPriceId,
        plan: base.plan,
        metadataPlan,
      };
    }
  }

  if (rawMetadataPlan && !metadataPlan) {
    return {
      ok: false,
      reason: 'subscription_metadata_plan_invalid',
      priceId: base.priceId,
      plan: base.plan,
      metadataPlan: null,
    };
  }

  if (metadataPlan && metadataPlan !== base.plan) {
    return {
      ok: false,
      reason: 'subscription_metadata_plan_mismatch',
      priceId: base.priceId,
      plan: base.plan,
      metadataPlan,
    };
  }

  return {
    ok: true,
    reason: 'allowlisted_price',
    priceId: base.priceId,
    plan: base.plan,
    metadataPlan,
  };
}
