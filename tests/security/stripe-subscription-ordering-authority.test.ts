import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import { normalizeStripeEntitlementEvent } from '../../src/server/billing/stripe-entitlement-runtime';

const WEBHOOKS = new URL('../../src/server/billing/stripe-webhooks.ts', import.meta.url);
const ENTITLEMENT_RUNTIME = new URL('../../src/server/billing/stripe-entitlement-runtime.ts', import.meta.url);
const SUBSCRIPTION_AUTHORITY = new URL('../../src/server/queries/subscription.ts', import.meta.url);

const now = new Date('2026-08-18T20:00:00.000Z');
const metadata = {
  organization_id: '11111111-1111-4111-8111-111111111111',
  entitlement_source_id: '22222222-2222-4222-8222-222222222222',
  plan_code: 'professional',
  full_seat_limit: '25',
  participant_seat_limit: '50',
  viewer_seat_limit: '100',
  source_version: '9',
  grace_period_days: '0',
};

function staleUpdatedEventWithProviderCanceledState() {
  return {
    id: 'evt_stale_active_delivered_after_cancel',
    object: 'event',
    type: 'customer.subscription.updated',
    created: Math.floor(now.valueOf() / 1000) - 60,
    livemode: true,
    data: {
      object: {
        id: 'sub_ordering',
        object: 'subscription',
        status: 'canceled',
        metadata,
        items: {
          data: [{ current_period_end: Math.floor(now.valueOf() / 1000) + 30 * 86_400 }],
        },
      },
    },
  } as unknown as Stripe.Event;
}

describe('Stripe out-of-order commercial authority', () => {
  it('treats provider-current canceled status as termination even when the delivered event type was updated', () => {
    const result = normalizeStripeEntitlementEvent(staleUpdatedEventWithProviderCanceledState(), now);

    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;

    expect(result.snapshot.fullSeatLimit).toBe(0);
    expect(result.snapshot.participantSeatLimit).toBe(0);
    expect(result.snapshot.viewerSeatLimit).toBe(0);
    expect(result.snapshot.validUntil).toBeNull();
    expect(result.snapshot.entitlements.subscription_terminated).toBe(true);
    expect(result.snapshot.entitlements.stripe_subscription_status).toBe('canceled');
  });

  it('retrieves live provider truth after the raw event is durably claimed and before subscription state is upserted', async () => {
    const source = await readFile(WEBHOOKS, 'utf8');

    const claimIndex = source.indexOf('const claimed = await claimStripeEventForProcessing(event);');
    const providerIndex = source.indexOf('const currentSubscription = await retrieveCurrentStripeSubscriptionForEvent(event);');
    const upsertIndex = source.indexOf('await upsertSubscriptionFromStripe(currentSubscription, event);');

    expect(claimIndex).toBeGreaterThan(-1);
    expect(providerIndex).toBeGreaterThan(-1);
    expect(upsertIndex).toBeGreaterThan(providerIndex);
    expect(source).toContain('payload: event as unknown as Record<string, unknown>');
  });

  it('reconciles entitlement decisions from the same provider-current subscription object', async () => {
    const source = await readFile(ENTITLEMENT_RUNTIME, 'utf8');

    expect(source).toContain('buildProviderTruthStripeSubscriptionEvent(event)');
    expect(source).toContain('normalizeStripeEntitlementEvent(providerTruthEvent)');
    expect(source).toContain("object.status === 'canceled'");
  });

  it('keeps local commercial access restricted to active or trialing rows after provider synchronization', async () => {
    const source = await readFile(SUBSCRIPTION_AUTHORITY, 'utf8');

    expect(source).toContain(".in('status', ['active', 'trialing'])");
    expect(source).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(source).toContain("return { plan: 'starter', licensed: false, source: 'none' };");
  });
});
