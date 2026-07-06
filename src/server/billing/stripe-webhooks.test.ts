/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  writeAuditLog: vi.fn(),
  reportError: vi.fn(),
  sendEmail: vi.fn(),
  getUserEmailById: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock('@/lib/email/templates', () => ({
  paymentFailedEmail: () => ({ subject: 'Payment failed', html: '<p>Payment failed</p>', text: 'Payment failed' }),
}));

vi.mock('@/server/users/email', () => ({
  getUserEmailById: mocks.getUserEmailById,
}));

import { handleStripeWebhookEvent } from './stripe-webhooks';

type SupabaseState = {
  eventInsertError?: { code?: string; message?: string } | null;
  eventUpdateError?: { code?: string; message?: string } | null;
  eventLookupData?: { id: string; status: string | null } | null;
  eventReclaimData?: { id: string } | null;
  organizationData?: { id: string; name?: string; created_by?: string; clerk_org_id?: string | null } | null;
  organizationError?: { code?: string; message?: string } | null;
  subscriptionData?: Record<string, unknown> | Array<Record<string, unknown>> | null;
  subscriptionError?: { code?: string; message?: string } | null;
  upsertError?: { code?: string; message?: string } | null;
  eventInsert: ReturnType<typeof vi.fn>;
  eventUpdates: Array<Record<string, unknown>>;
  upsert: ReturnType<typeof vi.fn>;
};

let state: SupabaseState;

function makeSelectBuilder(result: () => { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result()),
    maybeSingle: vi.fn(async () => result()),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) => {
      return Promise.resolve(result()).then(resolve, reject);
    },
  };

  return builder;
}

function makeEventUpdateBuilder(payload: Record<string, unknown>) {
  const filters: Array<{ column: string; value: string }> = [];
  const builder = {
    eq: vi.fn((column: string, value: string) => {
      filters.push({ column, value });
      return builder;
    }),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => {
      state.eventUpdates.push({ filters, payload, operation: 'reclaim' });
      return { data: state.eventReclaimData ?? { id: 'evt_reclaimed' }, error: state.eventUpdateError ?? null };
    }),
    then: (resolve: (value: { error: unknown }) => unknown, reject?: (reason: unknown) => unknown) => {
      state.eventUpdates.push({ filters, column: filters[0]?.column, value: filters[0]?.value, payload, operation: 'update' });
      return Promise.resolve({ error: state.eventUpdateError ?? null }).then(resolve, reject);
    },
  };

  return builder;
}

function buildSupabaseClient() {
  return {
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user: { email: 'billing@example.test' } }, error: null })),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'stripe_events_processed') {
        return {
          insert: state.eventInsert,
          update: vi.fn((payload: Record<string, unknown>) => makeEventUpdateBuilder(payload)),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: state.eventLookupData ?? null, error: null })) })),
          })),
        };
      }

      if (table === 'organizations') {
        return makeSelectBuilder(() => ({
          data: state.organizationData ?? { id: 'org_a', name: 'Acme Compliance', created_by: 'user_admin', clerk_org_id: null },
          error: state.organizationError ?? null,
        }));
      }

      if (table === 'subscriptions') {
        const builder = makeSelectBuilder(() => ({ data: state.subscriptionData ?? null, error: state.subscriptionError ?? null }));
        return {
          ...builder,
          upsert: state.upsert,
        };
      }

      return makeSelectBuilder(() => ({ data: null, error: null }));
    }),
  };
}

function makeStripeEvent(type: string, object: Record<string, unknown>, id = `evt_${type.replace(/[^a-z0-9]/gi, '_')}`) {
  return {
    id,
    object: 'event',
    type,
    created: 1_800_000_000,
    livemode: false,
    api_version: '2025-02-24.acacia',
    data: { object },
  };
}

function makeSubscription(status: string, plan = 'business') {
  return {
    id: 'sub_123',
    object: 'subscription',
    customer: 'cus_123',
    status,
    current_period_end: 1_900_000_000,
    metadata: {
      organization_id: 'org_a',
      user_id: 'user_admin',
      plan,
    },
  };
}

function makeInvoicePaymentFailed() {
  return {
    id: 'in_123',
    object: 'invoice',
    customer: 'cus_123',
    subscription: 'sub_123',
  };
}

describe('Stripe webhook billing hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state = {
      eventInsertError: null,
      eventUpdateError: null,
      eventLookupData: null,
      eventReclaimData: null,
      organizationData: { id: 'org_a', name: 'Acme Compliance', created_by: 'user_admin', clerk_org_id: null },
      organizationError: null,
      subscriptionData: null,
      subscriptionError: null,
      upsertError: null,
      eventUpdates: [],
      eventInsert: vi.fn(async () => ({ error: state.eventInsertError ?? null })),
      upsert: vi.fn(async () => ({ error: state.upsertError ?? null })),
    };
    mocks.createAdminClient.mockImplementation(buildSupabaseClient);
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.getUserEmailById.mockResolvedValue('billing@example.test');
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it('ignores unsupported Stripe events without claiming idempotency', async () => {
    const result = await handleStripeWebhookEvent(makeStripeEvent('customer.created', { id: 'cus_123' }));

    expect(result).toEqual({ skipped: true, unsupported: true });
    expect(state.eventInsert).not.toHaveBeenCalled();
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it('skips duplicate webhook events before mutating subscription state', async () => {
    state.eventInsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    state.eventLookupData = { id: 'evt_customer_subscription_created', status: 'processed' };

    const result = await handleStripeWebhookEvent(makeStripeEvent('customer.subscription.created', makeSubscription('active')));

    expect(result).toEqual({ skipped: true, duplicate: true });
    expect(state.upsert).not.toHaveBeenCalled();
    expect(state.eventUpdates).toHaveLength(0);
  });

  it('reclaims a previously failed event so Stripe retries can recover from transient sync errors', async () => {
    state.eventInsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    state.eventLookupData = { id: 'evt_customer_subscription_updated', status: 'failed' };
    state.eventReclaimData = { id: 'evt_customer_subscription_updated' };

    const result = await handleStripeWebhookEvent(makeStripeEvent('customer.subscription.updated', makeSubscription('active')));

    expect(result).toEqual({ skipped: false });
    expect(state.upsert).toHaveBeenCalled();
    expect(state.eventUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operation: 'reclaim', payload: expect.objectContaining({ status: 'processing', error: null }) }),
        expect.objectContaining({ operation: 'update', payload: expect.objectContaining({ status: 'processed' }) }),
      ]),
    );
  });

  it.each([
    ['customer.subscription.created', 'active', 'billing.subscription_created'],
    ['customer.subscription.updated', 'past_due', 'billing.subscription_updated'],
    ['customer.subscription.deleted', 'canceled', 'billing.subscription_deleted'],
  ])('syncs %s into the local subscription authority', async (eventType, status, auditAction) => {
    const result = await handleStripeWebhookEvent(makeStripeEvent(eventType, makeSubscription(status)));

    expect(result).toEqual({ skipped: false });
    expect(state.eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('evt_customer_subscription'),
        type: eventType,
        status: 'processing',
      }),
    );

    const [subscriptionPayload, upsertOptions] = state.upsert.mock.calls[0];
    expect(subscriptionPayload).toMatchObject({
      organization_id: 'org_a',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      plan: 'growth',
      tier: 'growth',
      status,
    });
    expect(subscriptionPayload.entitlements).toEqual(expect.objectContaining({ users: 15, vendorRisk: true }));
    expect(upsertOptions).toEqual({ onConflict: 'organization_id' });
    expect(state.eventUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: 'id',
          payload: expect.objectContaining({ status: 'processed' }),
        }),
      ]),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: auditAction,
        organizationId: 'org_a',
        userId: 'user_admin',
        entityType: 'stripe_subscription',
        entityId: 'sub_123',
        metadata: expect.objectContaining({
          plan: 'growth',
          metadataPlan: 'business',
          planSource: 'subscription_metadata_fallback',
        }),
      }),
    );
  });

  it('handles failed payment waves without creating or upgrading entitlements', async () => {
    state.subscriptionData = [
      {
        organization_id: 'org_a',
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      },
    ];

    const result = await handleStripeWebhookEvent(makeStripeEvent('invoice.payment_failed', makeInvoicePaymentFailed()));

    expect(result).toEqual({ skipped: false });
    expect(state.upsert).not.toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'billing@example.test',
        subject: 'Payment failed',
      }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.payment_failed',
        organizationId: 'org_a',
        userId: 'user_admin',
        entityType: 'stripe_invoice',
        entityId: 'in_123',
        metadata: expect.objectContaining({
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
        }),
      }),
    );
  });

  it('rejects subscription events whose Stripe customer conflicts with the organization profile', async () => {
    state.subscriptionData = {
      organization_id: 'org_a',
      stripe_customer_id: 'cus_other',
      stripe_subscription_id: 'sub_existing',
      status: 'active',
    };

    await expect(handleStripeWebhookEvent(makeStripeEvent('customer.subscription.updated', makeSubscription('active')))).rejects.toThrow(
      'Stripe customer does not match organization billing profile',
    );
    expect(state.upsert).not.toHaveBeenCalled();
    expect(state.eventUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ payload: expect.objectContaining({ status: 'failed' }) }),
      ]),
    );
  });
});
