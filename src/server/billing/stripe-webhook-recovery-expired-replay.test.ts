/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  handleStripeWebhookEvent: vi.fn(),
  reconcileStripeEntitlementEvent: vi.fn(),
  reportError: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/lib/security/audit-log', () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock('@/server/billing/stripe-entitlement-runtime', () => ({
  reconcileStripeEntitlementEvent: mocks.reconcileStripeEntitlementEvent,
}));
vi.mock('@/server/billing/stripe-webhooks', () => ({
  getStripeEventAuditContext: vi.fn(() => ({ organizationId: 'org_a', actorUserId: null })),
  handleStripeWebhookEvent: mocks.handleStripeWebhookEvent,
}));

import { handleStripeWebhookEventWithRecovery } from './stripe-webhook-recovery';

function makeEvent() {
  return {
    id: 'evt_expired_materialized',
    object: 'event',
    type: 'customer.subscription.updated',
    created: 1_700_000_000,
    livemode: false,
    data: { object: { id: 'sub_expired' } },
  };
}

function clientWithSnapshots(snapshots: Array<Record<string, unknown>>) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'stripe_events_processed') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: 'evt_expired_materialized', status: 'processed' },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'enterprise_entitlement_snapshots') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: snapshots, error: null })),
            })),
          })),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe('processed Stripe replay after billing-period expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handleStripeWebhookEvent.mockResolvedValue({ skipped: true, duplicate: true });
    mocks.reconcileStripeEntitlementEvent.mockRejectedValue(
      new Error('stripe_entitlement_billing_period_missing'),
    );
  });

  it('returns the retained exact idempotency snapshot instead of a permanent 500 loop', async () => {
    mocks.createAdminClient.mockImplementation(() => clientWithSnapshots([
      {
        id: '33333333-3333-4333-8333-333333333333',
        applied_policy_version: 8,
        source_version: 3,
      },
    ]));

    const result = await handleStripeWebhookEventWithRecovery(makeEvent());

    expect(result).toEqual({
      skipped: true,
      duplicate: true,
      entitlement: {
        outcome: 'idempotent_replay',
        stripeEventId: 'evt_expired_materialized',
        snapshotId: '33333333-3333-4333-8333-333333333333',
        appliedPolicyVersion: 8,
        sourceVersion: 3,
      },
    });
    expect(mocks.reconcileStripeEntitlementEvent).toHaveBeenCalledTimes(1);
  });

  it('preserves the freshness failure when the processed event never materialized a snapshot', async () => {
    mocks.createAdminClient.mockImplementation(() => clientWithSnapshots([]));

    await expect(handleStripeWebhookEventWithRecovery(makeEvent())).rejects.toThrow(
      'stripe_entitlement_billing_period_missing',
    );
  });

  it('fails closed if the supposedly unique Stripe idempotency key is ambiguous', async () => {
    mocks.createAdminClient.mockImplementation(() => clientWithSnapshots([
      { id: '33333333-3333-4333-8333-333333333333', applied_policy_version: 8, source_version: 3 },
      { id: '44444444-4444-4444-8444-444444444444', applied_policy_version: 9, source_version: 4 },
    ]));

    await expect(handleStripeWebhookEventWithRecovery(makeEvent())).rejects.toThrow(
      'stripe_entitlement_snapshot_ambiguous',
    );
  });
});
