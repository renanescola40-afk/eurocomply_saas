/* eslint-disable */
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEmailIdempotencyContextKey } from '@/lib/email/idempotency-context';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getStripeEventAuditContext: vi.fn(() => ({ organizationId: 'org_a', actorUserId: 'user_admin', objectId: 'sub_123' })),
  handleStripeWebhookEvent: vi.fn(),
  reportError: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/server/billing/stripe-webhooks', () => ({
  getStripeEventAuditContext: mocks.getStripeEventAuditContext,
  handleStripeWebhookEvent: mocks.handleStripeWebhookEvent,
}));

import {
  STRIPE_EVENT_PROCESSING_LEASE_MS,
  handleStripeWebhookEventWithRecovery,
  isStripeEventProcessingLeaseExpired,
  recoverAbandonedStripeEventClaim,
} from './stripe-webhook-recovery';

type State = {
  lookupData: { id: string; status: string | null; updated_at: string | null } | null;
  lookupError: unknown;
  recoveryData: { id: string } | null;
  recoveryError: unknown;
  updates: Array<{ payload: Record<string, unknown>; filters: Array<{ column: string; value: string }> }>;
};

let state: State;

function buildSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('stripe_events_processed');

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: state.lookupData, error: state.lookupError })),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => {
          const filters: Array<{ column: string; value: string }> = [];
          const builder = {
            eq: vi.fn((column: string, value: string) => {
              filters.push({ column, value });
              return builder;
            }),
            select: vi.fn(() => builder),
            maybeSingle: vi.fn(async () => {
              state.updates.push({ payload, filters });
              return { data: state.recoveryData, error: state.recoveryError };
            }),
          };
          return builder;
        }),
      };
    }),
  };
}

function makeEvent(type = 'customer.subscription.updated') {
  return {
    id: 'evt_lease_recovery',
    object: 'event',
    type,
    created: 1_800_000_000,
    livemode: false,
    data: {
      object: {
        id: 'sub_123',
        metadata: { organization_id: 'org_a', user_id: 'user_admin' },
      },
    },
  };
}

describe('Stripe webhook processing lease recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state = {
      lookupData: null,
      lookupError: null,
      recoveryData: null,
      recoveryError: null,
      updates: [],
    };
    mocks.createAdminClient.mockImplementation(buildSupabaseClient);
    mocks.writeAuditLog.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a bounded lease and rejects missing or invalid timestamps', () => {
    const nowMs = Date.parse('2026-07-14T12:00:00.000Z');

    expect(isStripeEventProcessingLeaseExpired(null, nowMs)).toBe(false);
    expect(isStripeEventProcessingLeaseExpired('invalid', nowMs)).toBe(false);
    expect(
      isStripeEventProcessingLeaseExpired(new Date(nowMs - STRIPE_EVENT_PROCESSING_LEASE_MS + 1).toISOString(), nowMs),
    ).toBe(false);
    expect(
      isStripeEventProcessingLeaseExpired(new Date(nowMs - STRIPE_EVENT_PROCESSING_LEASE_MS).toISOString(), nowMs),
    ).toBe(true);
  });

  it('does not replay a fresh processing claim', async () => {
    const nowMs = Date.parse('2026-07-14T12:00:00.000Z');
    state.lookupData = {
      id: 'evt_lease_recovery',
      status: 'processing',
      updated_at: new Date(nowMs - 60_000).toISOString(),
    };
    mocks.handleStripeWebhookEvent.mockResolvedValue({ skipped: true, duplicate: true });

    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const result = await handleStripeWebhookEventWithRecovery(makeEvent());

    expect(result).toEqual({ skipped: true, duplicate: true });
    expect(mocks.handleStripeWebhookEvent).toHaveBeenCalledTimes(1);
    expect(state.updates).toHaveLength(0);
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('atomically expires and replays an abandoned subscription claim', async () => {
    const nowMs = Date.parse('2026-07-14T12:00:00.000Z');
    const staleUpdatedAt = new Date(nowMs - STRIPE_EVENT_PROCESSING_LEASE_MS - 1).toISOString();
    state.lookupData = {
      id: 'evt_lease_recovery',
      status: 'processing',
      updated_at: staleUpdatedAt,
    };
    state.recoveryData = { id: 'evt_lease_recovery' };
    mocks.handleStripeWebhookEvent
      .mockResolvedValueOnce({ skipped: true, duplicate: true })
      .mockResolvedValueOnce({ skipped: false });

    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const result = await handleStripeWebhookEventWithRecovery(makeEvent());

    expect(result).toEqual({ skipped: false });
    expect(mocks.handleStripeWebhookEvent).toHaveBeenCalledTimes(2);
    expect(state.updates).toEqual([
      {
        payload: {
          status: 'failed',
          failed_at: new Date(nowMs).toISOString(),
          error: 'processing_lease_expired',
        },
        filters: [
          { column: 'id', value: 'evt_lease_recovery' },
          { column: 'status', value: 'processing' },
          { column: 'updated_at', value: staleUpdatedAt },
        ],
      },
    ]);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_processing_lease_recovered',
        organizationId: 'org_a',
        entityId: 'evt_lease_recovery',
        metadata: expect.objectContaining({ recoveryReason: 'processing_lease_expired' }),
      }),
    );
  });

  it('does not replay when another request wins the atomic recovery race', async () => {
    const nowMs = Date.parse('2026-07-14T12:00:00.000Z');
    state.lookupData = {
      id: 'evt_lease_recovery',
      status: 'processing',
      updated_at: new Date(nowMs - STRIPE_EVENT_PROCESSING_LEASE_MS - 1).toISOString(),
    };
    state.recoveryData = null;
    mocks.handleStripeWebhookEvent.mockResolvedValue({ skipped: true, duplicate: true });

    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const result = await handleStripeWebhookEventWithRecovery(makeEvent());

    expect(result).toEqual({ skipped: true, duplicate: true });
    expect(mocks.handleStripeWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('recovers payment-failed events with the same deterministic email key on replay', async () => {
    const nowMs = Date.parse('2026-07-14T12:00:00.000Z');
    const staleUpdatedAt = new Date(nowMs - STRIPE_EVENT_PROCESSING_LEASE_MS - 1).toISOString();
    state.lookupData = {
      id: 'evt_lease_recovery',
      status: 'processing',
      updated_at: staleUpdatedAt,
    };
    state.recoveryData = { id: 'evt_lease_recovery' };
    const observedKeys: Array<string | null> = [];
    mocks.handleStripeWebhookEvent
      .mockImplementationOnce(async () => {
        observedKeys.push(getEmailIdempotencyContextKey());
        return { skipped: true, duplicate: true };
      })
      .mockImplementationOnce(async () => {
        observedKeys.push(getEmailIdempotencyContextKey());
        return { skipped: false };
      });

    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    const result = await handleStripeWebhookEventWithRecovery(makeEvent('invoice.payment_failed'));

    expect(result).toEqual({ skipped: false });
    expect(observedKeys).toHaveLength(2);
    expect(observedKeys[0]).toMatch(/^stripe-payment-failed-email:[a-f0-9]{64}$/);
    expect(observedKeys[1]).toBe(observedKeys[0]);
    expect(getEmailIdempotencyContextKey()).toBeNull();
  });

  it('fails closed when the claim ledger cannot be read', async () => {
    state.lookupError = new Error('database unavailable');

    await expect(recoverAbandonedStripeEventClaim(makeEvent())).rejects.toThrow('database unavailable');
    expect(state.updates).toHaveLength(0);
  });
});
