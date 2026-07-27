import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import { normalizeStripeEntitlementEvent } from './stripe-entitlement-runtime';

const now = new Date('2026-07-26T12:00:00.000Z');

function event(type: Stripe.Event.Type, metadata: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: `evt_${type.replace(/\W/g, '_')}`,
    type,
    created: Math.floor(now.valueOf() / 1000),
    livemode: true,
    data: { object: { metadata, current_period_end: Math.floor(now.valueOf() / 1000) + 86_400, ...extra } },
  } as unknown as Stripe.Event;
}

const metadata = {
  organization_id: '11111111-1111-4111-8111-111111111111',
  entitlement_source_id: '22222222-2222-4222-8222-222222222222',
  plan_code: 'enterprise-1000',
  full_seat_limit: '1000',
  participant_seat_limit: '3000',
  viewer_seat_limit: '5000',
  source_version: '7',
  grace_period_days: '14',
};

describe('normalizeStripeEntitlementEvent', () => {
  it('creates an idempotent tenant-scoped snapshot', () => {
    const result = normalizeStripeEntitlementEvent(event('customer.subscription.updated', metadata), now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.snapshot.idempotencyKey).toContain('stripe:evt_');
    expect(result.snapshot.fullSeatLimit).toBe(1000);
    expect(result.snapshot.expectedSourceVersion).toBe(7);
  });

  it('defers cancellation downgrade until period end', () => {
    const result = normalizeStripeEntitlementEvent(event('customer.subscription.deleted', metadata), now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.deferredDowngrade).toBe(true);
    expect(result.snapshot.fullSeatLimit).toBe(0);
    expect(result.snapshot.entitlements.downgrade_deferred_until).toBeTruthy();
  });

  it('extends delinquent validity through the configured grace period', () => {
    const result = normalizeStripeEntitlementEvent(event('invoice.payment_failed', metadata), now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.snapshot.entitlements.billing_delinquent).toBe(true);
    expect(new Date(result.snapshot.validUntil).valueOf()).toBeGreaterThan(now.valueOf() + 86_400_000);
  });

  it('fails closed when canonical metadata is missing', () => {
    expect(normalizeStripeEntitlementEvent(event('invoice.paid', {}), now)).toEqual({ outcome: 'metadata_missing' });
  });

  it('does not reconcile unrelated Stripe events', () => {
    expect(normalizeStripeEntitlementEvent(event('charge.refunded', metadata), now)).toEqual({ outcome: 'unsupported' });
  });
});
