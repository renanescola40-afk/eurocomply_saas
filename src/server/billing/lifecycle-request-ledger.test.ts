import { describe, expect, it } from 'vitest';

import {
  BILLING_LIFECYCLE_LEASE_MS,
  BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED,
  BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT,
  BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED,
  canExpireBillingLifecycleLease,
  isBillingLifecycleLeaseStale,
} from './lifecycle-request-ledger';

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

  it('expires only stale leases that have not entered the provider side-effect phase', () => {
    const now = Date.parse('2026-08-12T20:00:00.000Z');
    const staleAt = new Date(now - BILLING_LIFECYCLE_LEASE_MS).toISOString();

    expect(
      canExpireBillingLifecycleLease(
        { id: 'req_1', status: 'processing', failure_code: null, updated_at: staleAt },
        now,
      ),
    ).toBe(true);

    for (const failureCode of [
      BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT,
      BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED,
      BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED,
    ]) {
      expect(
        canExpireBillingLifecycleLease(
          { id: 'req_1', status: 'processing', failure_code: failureCode, updated_at: staleAt },
          now,
        ),
      ).toBe(false);
    }
  });

  it('does not expire terminal rows even when their timestamp is stale', () => {
    const now = Date.parse('2026-08-12T20:00:00.000Z');
    const staleAt = new Date(now - BILLING_LIFECYCLE_LEASE_MS * 2).toISOString();

    expect(
      canExpireBillingLifecycleLease(
        { id: 'req_1', status: 'failed', failure_code: 'stripe_mutation_failed', updated_at: staleAt },
        now,
      ),
    ).toBe(false);
  });
});
