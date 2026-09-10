import { describe, expect, it } from 'vitest';

import { resolveReconciledAddOnStatus } from './add-on-reconciliation';

describe('Stripe add-on reconciliation payment authority', () => {
  it('does not activate a newly-added item from subscription.updated alone', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', null)).toBe('inactive');
  });

  it('activates an eligible item only when the paid invoice contains that subscription item', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'active', 'inactive', true)).toBe('active');
  });

  it('does not let an old or unrelated paid invoice activate a newer add-on item', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'active', 'inactive', false)).toBe('inactive');
    expect(resolveReconciledAddOnStatus('invoice.paid', 'active', null, false)).toBe('inactive');
  });

  it('preserves already-paid access when an unrelated invoice is replayed', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'active', 'active', false)).toBe('active');
  });

  it('suspends paid access on invoice.payment_failed and does not revive it from update ordering', () => {
    expect(resolveReconciledAddOnStatus('invoice.payment_failed', 'active', 'active')).toBe('past_due');
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', 'past_due')).toBe('past_due');
  });

  it('preserves already-paid access across benign subscription updates', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.updated', 'active', 'active')).toBe('active');
  });

  it('never reactivates a cancelled subscription from a late paid invoice', () => {
    expect(resolveReconciledAddOnStatus('invoice.paid', 'canceled', 'cancelled', true)).toBe('cancelled');
  });

  it('cancels add-on authority with the subscription deletion event', () => {
    expect(resolveReconciledAddOnStatus('customer.subscription.deleted', 'canceled', 'active')).toBe('cancelled');
  });
});
