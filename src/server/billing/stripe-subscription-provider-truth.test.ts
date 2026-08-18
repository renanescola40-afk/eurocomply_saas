import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    subscriptions: {
      retrieve: mocks.retrieve,
    },
  }),
}));

import {
  buildProviderTruthStripeSubscriptionEvent,
  retrieveCurrentStripeSubscriptionForEvent,
  stripeSubscriptionIdFromLifecycleEvent,
} from './stripe-subscription-provider-truth';

function subscription(status: Stripe.Subscription.Status = 'active') {
  return {
    id: 'sub_ordering',
    object: 'subscription',
    status,
    customer: 'cus_ordering',
    metadata: { organization_id: 'org_ordering', plan: 'professional' },
  } as unknown as Stripe.Subscription;
}

function event(options: {
  type?: Stripe.Event.Type;
  livemode?: boolean;
  object?: Stripe.Subscription;
} = {}) {
  return {
    id: 'evt_ordering',
    object: 'event',
    type: options.type ?? 'customer.subscription.updated',
    created: 1_800_000_000,
    livemode: options.livemode ?? true,
    data: { object: options.object ?? subscription('active') },
  } as unknown as Stripe.Event;
}

describe('Stripe subscription provider truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts the subscription id only from subscription lifecycle events', () => {
    expect(stripeSubscriptionIdFromLifecycleEvent(event())).toBe('sub_ordering');
    expect(stripeSubscriptionIdFromLifecycleEvent(event({ type: 'invoice.paid' }))).toBeNull();
  });

  it('retrieves current Stripe state for live lifecycle events instead of trusting arrival order', async () => {
    const current = subscription('canceled');
    mocks.retrieve.mockResolvedValue(current);

    const resolved = await retrieveCurrentStripeSubscriptionForEvent(event({ object: subscription('active') }));

    expect(mocks.retrieve).toHaveBeenCalledWith('sub_ordering');
    expect(resolved).toBe(current);
    expect(resolved.status).toBe('canceled');
  });

  it('keeps test-mode lifecycle events deterministic because they cannot grant live commercial authority', async () => {
    const signedObject = subscription('active');
    const resolved = await retrieveCurrentStripeSubscriptionForEvent(event({ livemode: false, object: signedObject }));

    expect(resolved).toBe(signedObject);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });

  it('fails closed when provider truth does not match the signed subscription id', async () => {
    mocks.retrieve.mockResolvedValue({ ...subscription('active'), id: 'sub_other' });

    await expect(retrieveCurrentStripeSubscriptionForEvent(event())).rejects.toThrow(
      'stripe_subscription_provider_truth_mismatch',
    );
  });

  it('preserves event identity and chronology while replacing only decision state', async () => {
    mocks.retrieve.mockResolvedValue(subscription('canceled'));
    const signed = event({ object: subscription('active') });

    const authority = await buildProviderTruthStripeSubscriptionEvent(signed);

    expect(authority).not.toBe(signed);
    expect(authority.id).toBe(signed.id);
    expect(authority.type).toBe(signed.type);
    expect(authority.created).toBe(signed.created);
    expect((authority.data.object as Stripe.Subscription).status).toBe('canceled');
    expect((signed.data.object as Stripe.Subscription).status).toBe('active');
  });
});
