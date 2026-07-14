import { describe, expect, it } from 'vitest';

import {
  getStripeWebhookEmailIdempotencyKey,
  withStripeWebhookEmailContext,
} from './stripe-webhook-email-context';

describe('Stripe webhook email idempotency context', () => {
  it('returns no key outside a verified webhook operation', () => {
    expect(getStripeWebhookEmailIdempotencyKey()).toBeUndefined();
  });

  it('derives a stable key from the exact event identity', async () => {
    const first = await withStripeWebhookEmailContext(
      { eventId: 'evt_payment_failed_123', eventType: 'invoice.payment_failed' },
      async () => getStripeWebhookEmailIdempotencyKey(),
    );
    const second = await withStripeWebhookEmailContext(
      { eventId: 'evt_payment_failed_123', eventType: 'invoice.payment_failed' },
      async () => getStripeWebhookEmailIdempotencyKey(),
    );
    const otherEvent = await withStripeWebhookEmailContext(
      { eventId: 'evt_payment_failed_456', eventType: 'invoice.payment_failed' },
      async () => getStripeWebhookEmailIdempotencyKey(),
    );

    expect(first).toMatch(/^stripe-webhook-email-v1:[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(otherEvent).not.toBe(first);
  });

  it('isolates concurrent event contexts', async () => {
    const [first, second] = await Promise.all([
      withStripeWebhookEmailContext(
        { eventId: 'evt_concurrent_a', eventType: 'invoice.payment_failed' },
        async () => {
          await Promise.resolve();
          return getStripeWebhookEmailIdempotencyKey();
        },
      ),
      withStripeWebhookEmailContext(
        { eventId: 'evt_concurrent_b', eventType: 'invoice.payment_failed' },
        async () => {
          await Promise.resolve();
          return getStripeWebhookEmailIdempotencyKey();
        },
      ),
    ]);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
    expect(getStripeWebhookEmailIdempotencyKey()).toBeUndefined();
  });

  it('rejects incomplete event identities', async () => {
    await expect(
      withStripeWebhookEmailContext(
        { eventId: '', eventType: 'invoice.payment_failed' },
        async () => undefined,
      ),
    ).rejects.toThrow('requires an event ID and event type');
  });
});
