import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { getInvoiceSubscriptionId } from './stripe-invoice-subscription-id';

function invoice(value: Record<string, unknown>) {
  return value as unknown as Stripe.Invoice;
}

describe('Stripe invoice subscription identity', () => {
  it('resolves legacy subscription references', () => {
    expect(getInvoiceSubscriptionId(invoice({ subscription: ' sub_legacy ' }))).toBe('sub_legacy');
    expect(getInvoiceSubscriptionId(invoice({ subscription: { id: 'sub_expanded' } }))).toBe('sub_expanded');
  });

  it('resolves current nested parent.subscription_details references', () => {
    expect(getInvoiceSubscriptionId(invoice({
      parent: { subscription_details: { subscription: 'sub_parent' } },
    }))).toBe('sub_parent');

    expect(getInvoiceSubscriptionId(invoice({
      parent: { subscription_details: { subscription: { id: 'sub_parent_expanded' } } },
    }))).toBe('sub_parent_expanded');
  });

  it('accepts equivalent legacy and current references', () => {
    expect(getInvoiceSubscriptionId(invoice({
      subscription: 'sub_same',
      parent: { subscription_details: { subscription: { id: 'sub_same' } } },
    }))).toBe('sub_same');
  });

  it('rejects conflicting subscription identities without guessing which tenant to notify', () => {
    expect(() => getInvoiceSubscriptionId(invoice({
      subscription: 'sub_a',
      parent: { subscription_details: { subscription: 'sub_b' } },
    }))).toThrow('stripe_invoice_subscription_reference_mismatch');
  });

  it('does not fabricate a subscription identity for a one-off invoice', () => {
    expect(getInvoiceSubscriptionId(invoice({ customer: 'cus_123' }))).toBeNull();
    expect(getInvoiceSubscriptionId(invoice({
      subscription: '  ',
      parent: { subscription_details: { subscription: null } },
    }))).toBeNull();
  });
});
