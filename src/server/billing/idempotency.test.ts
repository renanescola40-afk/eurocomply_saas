import { describe, expect, it } from 'vitest';

import {
  BILLING_IDEMPOTENCY_MAX_LENGTH,
  BILLING_IDEMPOTENCY_MIN_LENGTH,
  deriveStripeIdempotencyKey,
  parseBillingIdempotencyKey,
} from './idempotency';

const base = {
  scope: 'checkout' as const,
  organizationId: 'org_123',
  userId: 'user_123',
};

describe('billing idempotency keys', () => {
  it('requires a client-provided key', () => {
    expect(parseBillingIdempotencyKey({ ...base, clientKey: null })).toEqual({
      ok: false,
      error: 'idempotency_key_required',
    });
  });

  it('rejects short, oversized and unsafe keys', () => {
    for (const clientKey of [
      'short',
      'x'.repeat(BILLING_IDEMPOTENCY_MAX_LENGTH + 1),
      'contains spaces 123',
      'contains/slash/123',
    ]) {
      expect(parseBillingIdempotencyKey({ ...base, clientKey })).toEqual({
        ok: false,
        error: 'invalid_idempotency_key',
      });
    }

    expect(BILLING_IDEMPOTENCY_MIN_LENGTH).toBe(8);
  });

  it('derives deterministic tenant-and-actor-scoped Stripe keys without exposing the raw key', () => {
    const clientKey = '90efc3b0-f8c7-4f55-9efe-f9abaf28ed41';
    const first = parseBillingIdempotencyKey({ ...base, clientKey });
    const second = parseBillingIdempotencyKey({ ...base, clientKey });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.context.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.context.stripeKey).toMatch(/^risck:checkout:[a-f0-9]{64}$/);
    expect(first.context.stripeKey).not.toContain(clientKey);
    expect(deriveStripeIdempotencyKey(first.context, 'checkout session')).toMatch(
      /^risck:checkout:[a-f0-9]{64}:checkout-session$/,
    );
  });

  it('does not allow a key to collide across organization, actor or billing scope', () => {
    const clientKey = 'same-client-key-0001';
    const variants = [
      parseBillingIdempotencyKey({ ...base, clientKey }),
      parseBillingIdempotencyKey({ ...base, organizationId: 'org_456', clientKey }),
      parseBillingIdempotencyKey({ ...base, userId: 'user_456', clientKey }),
      parseBillingIdempotencyKey({ ...base, scope: 'subscription', clientKey }),
    ];

    const digests = variants.map((variant) => {
      expect(variant.ok).toBe(true);
      return variant.ok ? variant.context.digest : '';
    });

    expect(new Set(digests).size).toBe(digests.length);
  });
});
