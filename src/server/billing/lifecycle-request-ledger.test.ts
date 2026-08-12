import { describe, expect, it } from 'vitest';

import {
  BILLING_LIFECYCLE_LEASE_MS,
  getBillingLifecycleReplaySnapshot,
  isBillingLifecycleLeaseStale,
  type BillingLifecycleRequestRow,
} from './lifecycle-request-ledger';

function completedRequest(resultSnapshot: unknown): BillingLifecycleRequestRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    requested_by: '33333333-3333-4333-8333-333333333333',
    action: 'upgrade',
    source_plan: 'starter',
    target_plan: 'business',
    billing_interval: 'year',
    add_ons: [],
    stripe_subscription_id: 'sub_synthetic',
    stripe_request_id: 'a'.repeat(64),
    request_fingerprint: 'b'.repeat(64),
    result_snapshot: resultSnapshot,
    status: 'completed',
    failure_code: null,
    requested_at: '2026-08-12T20:00:00.000Z',
    completed_at: '2026-08-12T20:01:00.000Z',
    updated_at: '2026-08-12T20:01:00.000Z',
  };
}

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

describe('billing lifecycle durable replay snapshot', () => {
  const validSnapshot = {
    subscriptionId: 'sub_synthetic',
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: 1788043256,
    plan: 'business',
    interval: 'year',
    addOns: [{ slug: 'advanced-reports', quantity: 2 }],
  } as const;

  it('returns only a canonical sanitized snapshot', () => {
    expect(getBillingLifecycleReplaySnapshot(completedRequest(validSnapshot))).toEqual(validSnapshot);
  });

  it('rejects non-canonical plans instead of replaying corrupted entitlement state', () => {
    expect(() => getBillingLifecycleReplaySnapshot(completedRequest({
      ...validSnapshot,
      plan: 'fully-compliant-unlimited',
    }))).toThrow('billing_lifecycle_ledger_unavailable');
  });

  it('rejects invalid Stripe period timestamps instead of replaying corrupted billing state', () => {
    expect(() => getBillingLifecycleReplaySnapshot(completedRequest({
      ...validSnapshot,
      currentPeriodEnd: '2026-08-29T22:40:56.000Z',
    }))).toThrow('billing_lifecycle_ledger_unavailable');
    expect(() => getBillingLifecycleReplaySnapshot(completedRequest({
      ...validSnapshot,
      currentPeriodEnd: -1,
    }))).toThrow('billing_lifecycle_ledger_unavailable');
  });

  it('rejects malformed add-ons instead of silently changing replay semantics', () => {
    expect(() => getBillingLifecycleReplaySnapshot(completedRequest({
      ...validSnapshot,
      addOns: [{ slug: '', quantity: 2 }],
    }))).toThrow('billing_lifecycle_ledger_unavailable');
  });
});
