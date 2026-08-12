import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

const mocks = vi.hoisted(() => ({
  reconcileEntitlementSnapshot: vi.fn(),
}));

vi.mock('@/server/enterprise/entitlement-reconciliation', () => ({
  reconcileEntitlementSnapshot: mocks.reconcileEntitlementSnapshot,
}));

import { reconcileStripeEntitlementEvent } from './stripe-entitlement-runtime';

const nowSeconds = Math.floor(Date.now() / 1000);
const metadata = {
  organization_id: '11111111-1111-4111-8111-111111111111',
  entitlement_source_id: '22222222-2222-4222-8222-222222222222',
  plan_code: 'professional',
  full_seat_limit: '25',
  participant_seat_limit: '50',
  viewer_seat_limit: '100',
  source_version: '1',
  grace_period_days: '7',
};

function event(options: { periodEnd?: number; metadataOverride?: Record<string, string> } = {}) {
  return {
    id: 'evt_basil_reconcile',
    object: 'event',
    type: 'customer.subscription.updated',
    created: nowSeconds,
    livemode: false,
    data: {
      object: {
        metadata: options.metadataOverride ?? metadata,
        items: options.periodEnd === undefined
          ? { data: [] }
          : { data: [{ current_period_end: options.periodEnd }] },
      },
    },
  } as unknown as Stripe.Event;
}

describe('reconcileStripeEntitlementEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the raw atomic RPC version_conflict outcome to the public runtime contract', async () => {
    mocks.reconcileEntitlementSnapshot.mockResolvedValue({
      outcome: 'version_conflict',
      snapshotId: null,
      appliedPolicyVersion: null,
      sourceVersion: 2,
    });

    const result = await reconcileStripeEntitlementEvent(event({ periodEnd: nowSeconds + 86_400 }));

    expect(result).toMatchObject({
      outcome: 'source_version_conflict',
      stripeEventId: 'evt_basil_reconcile',
      sourceVersion: 2,
    });
  });

  it('maps the raw atomic RPC lower_priority outcome to the public runtime contract', async () => {
    mocks.reconcileEntitlementSnapshot.mockResolvedValue({
      outcome: 'lower_priority',
      snapshotId: null,
      appliedPolicyVersion: null,
      sourceVersion: 1,
    });

    const result = await reconcileStripeEntitlementEvent(event({ periodEnd: nowSeconds + 86_400 }));

    expect(result).toMatchObject({
      outcome: 'lower_priority_source',
      stripeEventId: 'evt_basil_reconcile',
    });
  });

  it('maps applied and idempotent replay outcomes without changing snapshot provenance', async () => {
    mocks.reconcileEntitlementSnapshot
      .mockResolvedValueOnce({
        outcome: 'applied',
        snapshotId: '33333333-3333-4333-8333-333333333333',
        appliedPolicyVersion: 4,
        sourceVersion: 1,
      })
      .mockResolvedValueOnce({
        outcome: 'idempotent_replay',
        snapshotId: '33333333-3333-4333-8333-333333333333',
        appliedPolicyVersion: 4,
        sourceVersion: 1,
      });

    const first = await reconcileStripeEntitlementEvent(event({ periodEnd: nowSeconds + 86_400 }));
    const replay = await reconcileStripeEntitlementEvent(event({ periodEnd: nowSeconds + 86_400 }));

    expect(first).toMatchObject({ outcome: 'reconciled', snapshotId: '33333333-3333-4333-8333-333333333333' });
    expect(replay).toMatchObject({ outcome: 'idempotent_replay', snapshotId: '33333333-3333-4333-8333-333333333333' });
  });

  it('fails before the canonical RPC when a billable Stripe event has no billing period', async () => {
    await expect(reconcileStripeEntitlementEvent(event())).rejects.toThrow('stripe_entitlement_billing_period_missing');
    expect(mocks.reconcileEntitlementSnapshot).not.toHaveBeenCalled();
  });

  it('keeps missing canonical metadata non-mutating', async () => {
    const result = await reconcileStripeEntitlementEvent(event({
      periodEnd: nowSeconds + 86_400,
      metadataOverride: {},
    }));

    expect(result).toEqual({ outcome: 'metadata_missing' });
    expect(mocks.reconcileEntitlementSnapshot).not.toHaveBeenCalled();
  });
});
