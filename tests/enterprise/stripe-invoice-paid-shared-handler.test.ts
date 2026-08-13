import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { normalizeStripeEntitlementEvent } from '../../src/server/billing/stripe-entitlement-runtime';
import { isSupportedStripeWebhookEvent } from '../../src/server/billing/stripe-webhooks';

function makeInvoicePaidEvent(): Stripe.Event {
  return {
    id: 'evt_test_invoice_paid_shared_handler',
    object: 'event',
    type: 'invoice.paid',
    created: 1_800_000_000,
    livemode: false,
    api_version: '2026-05-27.dahlia',
    data: {
      object: {
        id: 'in_test_invoice_paid_shared_handler',
        object: 'invoice',
        parent: {
          subscription_details: {
            metadata: {
              organization_id: '11111111-1111-4111-8111-111111111111',
              entitlement_source_id: '22222222-2222-4222-8222-222222222222',
              plan_code: 'growth',
              full_seat_limit: '25',
              participant_seat_limit: '50',
              viewer_seat_limit: '100',
              source_version: '7',
              grace_period_days: '3',
            },
          },
        },
        lines: {
          data: [
            {
              parent: { type: 'subscription_item_details' },
              period: { end: 1_900_000_000 },
            },
          ],
        },
      },
    },
  } as unknown as Stripe.Event;
}

describe('Stripe invoice.paid shared webhook contract', () => {
  it('keeps the shared core aligned with the entitlement recovery event contract', () => {
    expect(isSupportedStripeWebhookEvent('invoice.paid')).toBe(true);
    expect(isSupportedStripeWebhookEvent('invoice.voided')).toBe(false);
  });

  it('normalizes invoice.paid as billing recovery without changing the contracted seat limits', () => {
    const normalized = normalizeStripeEntitlementEvent(
      makeInvoicePaidEvent(),
      new Date('2026-08-13T20:00:00.000Z'),
    );

    expect(normalized.outcome).toBe('normalized');
    if (normalized.outcome !== 'normalized') return;

    expect(normalized.snapshot).toMatchObject({
      organizationId: '11111111-1111-4111-8111-111111111111',
      sourceId: '22222222-2222-4222-8222-222222222222',
      expectedSourceVersion: 7,
      planCode: 'growth',
      fullSeatLimit: 25,
      participantSeatLimit: 50,
      viewerSeatLimit: 100,
      entitlements: {
        billing_provider: 'stripe',
        stripe_event_type: 'invoice.paid',
        stripe_livemode: false,
        billing_delinquent: false,
        billing_recovered: true,
        subscription_terminated: false,
      },
    });
    expect(normalized.snapshot.validUntil).toBe(new Date(1_900_000_000 * 1000).toISOString());
  });
});
