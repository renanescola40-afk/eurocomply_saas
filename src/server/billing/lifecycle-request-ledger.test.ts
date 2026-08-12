import { describe, expect, it } from 'vitest';

import { BILLING_LIFECYCLE_LEASE_MS, isBillingLifecycleLeaseStale } from './lifecycle-request-ledger';

describe('billing lifecycle request lease', () => {
  it('keeps a fresh processing request leased', () => {
    const now = Date.parse('2026-08-12T20:00:00.000Z');
    const updatedAt = new Date(now - BILLING_LIFECYCLE_LEASE_MS + 1).toISOString();

    expect(isBillingLifecycleLeaseStale(updatedAt, now)).toBe(false);
  });

  it('allows stale processing recovery at the lease boundary', () => {
    const now = Date.parse('2026-08-12T20:00:00.000Z');
    const updatedAt = new Date(now - BILLING_LIFECYCLE_LEASE_MS).toISOString();

    expect(isBillingLifecycleLeaseStale(updatedAt, now)).toBe(true);
  });

  it('treats missing or invalid timestamps as stale instead of permanently deadlocking billing', () => {
    expect(isBillingLifecycleLeaseStale(null, Date.now())).toBe(true);
    expect(isBillingLifecycleLeaseStale('not-a-date', Date.now())).toBe(true);
  });
});
