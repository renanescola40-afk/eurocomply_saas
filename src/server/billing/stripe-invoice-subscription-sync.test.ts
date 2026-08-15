/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  upsertSubscriptionFromStripe: vi.fn(),
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({ subscriptions: { retrieve: mocks.retrieve } }),
}));

vi.mock('@/server/billing/stripe-webhooks', () => ({
  upsertSubscriptionFromStripe: mocks.upsertSubscriptionFromStripe,
}));

import { syncStripeSubscriptionForInvoiceEvent } from './stripe-invoice-subscription-sync';

function invoiceEvent(type: 'invoice.paid' | 'invoice.payment_failed', invoice: Record<string, unknown>) {
  return {
    id: `evt_${type.replaceAll('.', '_')}`,
    type,
    data: { object: invoice },
  } as any;
}

describe('Stripe invoice subscription synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.retrieve.mockResolvedValue({ id: 'sub_live', status: 'active' });
    mocks.upsertSubscriptionFromStripe.mockResolvedValue(undefined);
  });

  it('refreshes provider subscription state for invoice.paid', async () => {
    const result = await syncStripeSubscriptionForInvoiceEvent(invoiceEvent('invoice.paid', { subscription: 'sub_live' }));

    expect(result).toEqual({ synced: true, subscriptionId: 'sub_live', status: 'active' });
    expect(mocks.retrieve).toHaveBeenCalledWith('sub_live');
    expect(mocks.upsertSubscriptionFromStripe).toHaveBeenCalledWith({ id: 'sub_live', status: 'active' });
  });

  it('refreshes provider subscription state for invoice.payment_failed', async () => {
    mocks.retrieve.mockResolvedValue({ id: 'sub_live', status: 'past_due' });

    const result = await syncStripeSubscriptionForInvoiceEvent(invoiceEvent('invoice.payment_failed', { subscription: 'sub_live' }));

    expect(result.status).toBe('past_due');
    expect(mocks.upsertSubscriptionFromStripe).toHaveBeenCalledTimes(1);
  });

  it('supports the current parent.subscription_details subscription reference', async () => {
    await syncStripeSubscriptionForInvoiceEvent(invoiceEvent('invoice.paid', {
      parent: { subscription_details: { subscription: 'sub_parent' } },
    }));

    expect(mocks.retrieve).toHaveBeenCalledWith('sub_parent');
  });

  it('does not mutate anything for non-invoice lifecycle events or one-off invoices', async () => {
    const nonInvoice = await syncStripeSubscriptionForInvoiceEvent({ type: 'customer.subscription.updated' } as any);
    const oneOff = await syncStripeSubscriptionForInvoiceEvent(invoiceEvent('invoice.paid', {}));

    expect(nonInvoice).toEqual({ synced: false, reason: 'not_invoice_lifecycle_event' });
    expect(oneOff).toEqual({ synced: false, reason: 'subscription_not_present' });
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.upsertSubscriptionFromStripe).not.toHaveBeenCalled();
  });
});
