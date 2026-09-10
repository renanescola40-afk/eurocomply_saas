import { describe, expect, it } from 'vitest';

import { resolveReconciledAddOnStatus } from './add-on-reconciliation';

describe('Stripe add-on reconciliation payment authority', () => {
  it('does not activate a newly-added item from subscription.updated alone', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', null)).toBe('inactive');
  });

  it('activates an eligible item only after invoice.paid', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'active', 'inactive')).toBe('active');
  });

  it('suspends paid access on invoice.payment_failed and does not revive it from update ordering', () => {
    expect(resolveReconciledAddOnStatus('invoice.payment_failed', 'active', 'active')).toBe('past_due');
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', 'past_due')).toBe('past_due');
  });

  it('preserves already-paid access across benign subscription updates', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', 'active')).toBe('active');
  });

  it('never reactivates a cancelled subscription from a late paid invoice', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'canceled', 'cancelled')).toBe('cancelled');
  });

  it('cancels add-on authority with the subscription deletion event', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.deleted', 'canceled', 'active')).toBe('cancelled');
  });
});
