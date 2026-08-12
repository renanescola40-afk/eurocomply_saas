import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import {
  normalizeStripeEntitlementEvent,
  stripeEntitlementPeriodEnd,
} from './stripe-entitlement-runtime';

const now = new Date('2026-07-26T12:00:00.000Z');
const oneDay = 86_400;

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

function stripeEvent(
  type: Stripe.Event.Type,
  object: Record<string, unknown>,
  overrides: Partial<Stripe.Event> = {},
) {
  return {
    id: `evt_${type.replace(/\W/g, '_')}`,
    object: 'event',
    type,
    created: Math.floor(now.valueOf() / 1000),
    livemode: true,
    data: { object },
    ...overrides,
  } as unknown as Stripe.Event;
}

function legacySubscriptionEvent(type: Stripe.Event.Type = 'customer.subscription.updated') {
  return stripeEvent(type, {
    metadata,
    current_period_end: Math.floor(now.valueOf() / 1000) + oneDay,
  });
}

describe('Stripe entitlement billing period extraction', () => {
  it('reads Basil item-level subscription periods and chooses the earliest boundary', () => {
    const first = Math.floor(now.valueOf() / 1000) + oneDay * 30;
    const second = Math.floor(now.valueOf() / 1000) + oneDay * 14;
    const event = stripeEvent('customer.subscription.updated', {
      metadata,
      items: {
        data: [
          { current_period_end: first },
          { current_period_end: second },
        ],
      },
    });

    expect(stripeEntitlementPeriodEnd(event)).toBe(second);
    const normalized = normalizeStripeEntitlementEvent(event, now);
    expect(normalized.outcome).toBe('normalized');
    if (normalized.outcome !== 'normalized') return;
    expect(normalized.snapshot.validUntil).toBe(new Date(second * 1000).toISOString());
  });

  it('keeps pre-Basil top-level subscription periods compatible', () => {
    const event = legacySubscriptionEvent();
    expect(stripeEntitlementPeriodEnd(event)).toBe(Math.floor(now.valueOf() / 1000) + oneDay);
  });

  it('reads invoice subscription metadata from the Basil parent and period from invoice lines', () => {
    const periodEnd = Math.floor(now.valueOf() / 1000) + oneDay * 20;
    const event = stripeEvent('invoice.paid', {
      metadata: {},
      parent: {
        subscription_details: { metadata },
      },
      lines: {
        data: [
          { period: { end: periodEnd + oneDay } },
          { period: { end: periodEnd } },
        ],
      },
    });

    const normalized = normalizeStripeEntitlementEvent(event, now);
    expect(normalized.outcome).toBe('normalized');
    if (normalized.outcome !== 'normalized') return;
    expect(normalized.snapshot.organizationId).toBe(metadata.organization_id);
    expect(normalized.snapshot.fullSeatLimit).toBe(1000);
    expect(normalized.snapshot.validUntil).toBe(new Date(periodEnd * 1000).toISOString());
    expect(normalized.snapshot.entitlements.billing_recovered).toBe(true);
  });

  it('keeps legacy invoice subscription_details metadata compatible', () => {
    const periodEnd = Math.floor(now.valueOf() / 1000) + oneDay * 10;
    const event = stripeEvent('invoice.paid', {
      subscription_details: { metadata },
      lines: { data: [{ period: { end: periodEnd } }] },
    });

    const normalized = normalizeStripeEntitlementEvent(event, now);
    expect(normalized.outcome).toBe('normalized');
    if (normalized.outcome !== 'normalized') return;
    expect(normalized.snapshot.planCode).toBe('enterprise-1000');
  });
});

describe('normalizeStripeEntitlementEvent', () => {
  it('creates an idempotent tenant-scoped snapshot', () => {
    const result = normalizeStripeEntitlementEvent(legacySubscriptionEvent(), now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.snapshot.idempotencyKey).toContain('stripe:evt_');
    expect(result.snapshot.fullSeatLimit).toBe(1000);
    expect(result.snapshot.expectedSourceVersion).toBe(7);
  });

  it('fails closed instead of inventing a period when a billable event has no billing window', () => {
    const event = stripeEvent('customer.subscription.updated', { metadata });
    expect(normalizeStripeEntitlementEvent(event, now)).toEqual({ outcome: 'billing_period_missing' });
  });

  it('fails closed when the recovered billing period is already expired', () => {
    const event = stripeEvent('customer.subscription.updated', {
      metadata,
      items: {
        data: [{ current_period_end: Math.floor(now.valueOf() / 1000) - 1 }],
      },
    });
    expect(normalizeStripeEntitlementEvent(event, now)).toEqual({ outcome: 'billing_period_missing' });
  });

  it('applies subscription deletion immediately without creating a future policy gap', () => {
    const futurePeriodEnd = Math.floor(now.valueOf() / 1000) + oneDay * 30;
    const event = stripeEvent('customer.subscription.deleted', {
      metadata,
      items: { data: [{ current_period_end: futurePeriodEnd }] },
    });

    const result = normalizeStripeEntitlementEvent(event, now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.snapshot.fullSeatLimit).toBe(0);
    expect(result.snapshot.participantSeatLimit).toBe(0);
    expect(result.snapshot.viewerSeatLimit).toBe(0);
    expect(result.snapshot.validFrom).toBe(now.toISOString());
    expect(result.snapshot.validUntil).toBeNull();
    expect(result.snapshot.entitlements.subscription_terminated).toBe(true);
  });

  it('extends delinquent validity through the configured grace period', () => {
    const periodEnd = Math.floor(now.valueOf() / 1000) + oneDay;
    const event = stripeEvent('invoice.payment_failed', {
      parent: { subscription_details: { metadata } },
      lines: { data: [{ period: { end: periodEnd } }] },
    });
    const result = normalizeStripeEntitlementEvent(event, now);
    expect(result.outcome).toBe('normalized');
    if (result.outcome !== 'normalized') return;
    expect(result.snapshot.entitlements.billing_delinquent).toBe(true);
    expect(new Date(result.snapshot.validUntil ?? 0).valueOf()).toBe(
      new Date(periodEnd * 1000).valueOf() + 14 * oneDay * 1000,
    );
  });

  it('does not use checkout completion as an entitlement authority without a billing period', () => {
    const event = stripeEvent('checkout.session.completed', { metadata });
    expect(normalizeStripeEntitlementEvent(event, now)).toEqual({ outcome: 'unsupported' });
  });

  it('fails closed when canonical metadata is missing', () => {
    expect(
      normalizeStripeEntitlementEvent(
        stripeEvent('invoice.paid', {
          lines: { data: [{ period: { end: Math.floor(now.valueOf() / 1000) + oneDay } }] },
        }),
        now,
      ),
    ).toEqual({ outcome: 'metadata_missing' });
  });

  it('does not reconcile unrelated Stripe events', () => {
    expect(normalizeStripeEntitlementEvent(stripeEvent('charge.refunded', { metadata }), now)).toEqual({ outcome: 'unsupported' });
  });
});
