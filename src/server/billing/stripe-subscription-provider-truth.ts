import type Stripe from 'stripe';

import { getStripeClient } from '@/server/billing/stripe';

const STRIPE_SUBSCRIPTION_LIFECYCLE_EVENTS = new Set<Stripe.Event.Type>([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

type StripeEventObjectWithId = {
  id?: string | null;
};

export function isStripeSubscriptionLifecycleEvent(event: Stripe.Event) {
  return STRIPE_SUBSCRIPTION_LIFECYCLE_EVENTS.has(event.type);
}

export function stripeSubscriptionIdFromLifecycleEvent(event: Stripe.Event) {
  if (!isStripeSubscriptionLifecycleEvent(event)) return null;

  const object = event.data.object as StripeEventObjectWithId;
  const id = typeof object?.id === 'string' ? object.id.trim() : '';
  return id || null;
}

/**
 * Stripe does not guarantee webhook delivery order. Never apply a live
 * subscription lifecycle payload as current commercial truth merely because that
 * event arrived last. After signature/mode validation and the durable event claim,
 * retrieve the subscription by ID from Stripe and use provider-current state for
 * local billing and entitlement decisions.
 *
 * Test-mode events can never satisfy RISCK COMPLY's live commercial authority
 * contract, so they remain deterministic and use the signed event object directly.
 */
export async function retrieveCurrentStripeSubscriptionForEvent(event: Stripe.Event) {
  const subscriptionId = stripeSubscriptionIdFromLifecycleEvent(event);
  if (!subscriptionId) {
    throw new Error('stripe_subscription_lifecycle_id_missing');
  }

  const eventSubscription = event.data.object as Stripe.Subscription;
  if (!event.livemode) {
    return eventSubscription;
  }

  const current = await getStripeClient().subscriptions.retrieve(subscriptionId);
  if (!current?.id || current.id !== subscriptionId) {
    throw new Error('stripe_subscription_provider_truth_mismatch');
  }

  return current;
}

/**
 * Build a decision-only event that preserves the signed event identity/type/time
 * while replacing data.object with current provider truth. The original event is
 * still what the event ledger persists and audits.
 */
export async function buildProviderTruthStripeSubscriptionEvent(event: Stripe.Event) {
  if (!isStripeSubscriptionLifecycleEvent(event)) return event;

  const current = await retrieveCurrentStripeSubscriptionForEvent(event);
  return {
    ...event,
    data: {
      ...event.data,
      object: current,
    },
  } as Stripe.Event;
}

export const stripeSubscriptionProviderTruthContract = {
  lifecycleEventTypes: [...STRIPE_SUBSCRIPTION_LIFECYCLE_EVENTS],
  liveCommercialAuthorityOnly: true,
} as const;
