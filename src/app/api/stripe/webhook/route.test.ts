/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  handleStripeWebhookEventWithRecovery: vi.fn(),
  syncStripeSubscriptionForInvoiceEvent: vi.fn(),
  syncEnterpriseContractBillingEvent: vi.fn(),
  getStripeEventAuditContext: vi.fn(() => ({ organizationId: 'org_a', actorUserId: 'user_admin', objectId: 'sub_123' })),
  reportError: vi.fn(),
  writeAuditLog: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  getClientIpFromRequest: vi.fn(() => '203.0.113.10'),
}));

vi.mock('@/lib/billing/stripe', () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  }),
}));

vi.mock('@/server/billing/stripe-webhook-recovery', () => ({
  handleStripeWebhookEventWithRecovery: mocks.handleStripeWebhookEventWithRecovery,
}));

vi.mock('@/server/billing/stripe-invoice-subscription-sync', () => ({
  syncStripeSubscriptionForInvoiceEvent: mocks.syncStripeSubscriptionForInvoiceEvent,
}));

vi.mock('@/server/enterprise/billing', () => ({
  syncEnterpriseContractBillingEvent: mocks.syncEnterpriseContractBillingEvent,
}));

vi.mock('@/server/billing/stripe-webhooks', () => ({
  getStripeEventAuditContext: mocks.getStripeEventAuditContext,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  getClientIpFromRequest: mocks.getClientIpFromRequest,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

import { POST, STRIPE_WEBHOOK_TOLERANCE_SECONDS, getStripeWebhookContentLength, readBoundedStripeWebhookBody } from './route';

const TEST_STRIPE_WEBHOOK_SECRET = 'test_webhook_signing_secret';

function makeWebhookRequest(body: string, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.example/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't=1,v1=test',
      ...headers,
    },
    body,
  });
}

function makePostRequest(signature = 't=1800000000,v1=bad') {
  return new Request('https://app.eurocomply.test/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ id: 'evt_invalid', type: 'customer.subscription.updated' }),
  });
}

function makeStripeEvent(type = 'customer.subscription.updated') {
  return {
    id: 'evt_valid',
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

describe('Stripe webhook body hardening', () => {
  it('parses safe finite content lengths only', () => {
    expect(getStripeWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '123' }))).toBe(123);
    expect(getStripeWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '-1' }))).toBeNull();
    expect(getStripeWebhookContentLength(makeWebhookRequest('{}', { 'content-length': 'NaN' }))).toBeNull();
    expect(getStripeWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '1.5' }))).toBeNull();
  });

  it('reads bounded webhook bodies', async () => {
    await expect(readBoundedStripeWebhookBody(makeWebhookRequest('{"ok":true}'))).resolves.toBe('{"ok":true}');
  });

  it('rejects oversized bodies before reading when content length is available', async () => {
    await expect(readBoundedStripeWebhookBody(makeWebhookRequest('{}', { 'content-length': '1000001' }))).resolves.toBeNull();
  });

  it('rejects oversized bodies after reading when content length is absent', async () => {
    const body = 'x'.repeat(1_000_001);
    await expect(readBoundedStripeWebhookBody(makeWebhookRequest(body))).resolves.toBeNull();
  });
});

describe('Stripe webhook route signature validation and dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = TEST_STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.writeAuditLog.mockResolvedValue({ persisted: true });
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });
    mocks.syncEnterpriseContractBillingEvent.mockResolvedValue({
      outcome: 'not_enterprise',
      matched: false,
      contractId: null,
      organizationId: 'org_a',
      previousStatus: null,
      appliedStatus: null,
      billingStatus: null,
      version: null,
    });
    mocks.syncStripeSubscriptionForInvoiceEvent.mockResolvedValue({ synced: false, reason: 'not_invoice_lifecycle_event' });
    mocks.handleStripeWebhookEventWithRecovery.mockResolvedValue({ skipped: false, duplicate: false, unsupported: false });
  });

  it('always rejects invalid Stripe signatures and does not process the event', async () => {
    const response = await POST(makePostRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_webhook' });
    expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
    expect(mocks.syncStripeSubscriptionForInvoiceEvent).not.toHaveBeenCalled();
    expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      expect.any(String),
      't=1800000000,v1=bad',
      TEST_STRIPE_WEBHOOK_SECRET,
      STRIPE_WEBHOOK_TOLERANCE_SECONDS,
    );
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid Stripe webhook signature' }),
      expect.objectContaining({ area: 'stripe_webhook_signature' }),
    );
    expect(mocks.reportError).not.toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('No signatures found') }), expect.anything());
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_rejected',
        entityType: 'stripe_webhook_event',
        metadata: expect.objectContaining({ reason: 'invalid_signature' }),
      }),
    );
  });

  it('fails closed when the Stripe signature header is missing', async () => {
    const response = await POST(
      new Request('https://app.eurocomply.test/api/stripe/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'missing_signature' });
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
    expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_rejected',
        metadata: expect.objectContaining({ reason: 'missing_signature' }),
      }),
    );
  });

  it('routes a matched Enterprise event before every self-service side effect', async () => {
    const event = makeStripeEvent();
    mocks.constructEvent.mockReturnValue(event);
    mocks.syncEnterpriseContractBillingEvent.mockResolvedValue({
      outcome: 'synced',
      matched: true,
      contractId: '11111111-1111-4111-8111-111111111111',
      organizationId: 'org_a',
      previousStatus: 'pending_activation',
      appliedStatus: 'active',
      billingStatus: 'active',
      version: 2,
    });

    const response = await POST(makePostRequest('t=1800000000,v1=good'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      received: true,
      enterprise: true,
      skipped: false,
      duplicate: false,
      unsupported: false,
      contractId: '11111111-1111-4111-8111-111111111111',
      contractStatus: 'active',
      billingStatus: 'active',
    });
    expect(mocks.syncEnterpriseContractBillingEvent).toHaveBeenCalledWith(event);
    expect(mocks.syncStripeSubscriptionForInvoiceEvent).not.toHaveBeenCalled();
    expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'webhook_received', entityId: 'evt_valid' }),
    );
  });

  it('treats duplicate Enterprise events as successful idempotent no-ops', async () => {
    const event = makeStripeEvent();
    mocks.constructEvent.mockReturnValue(event);
    mocks.syncEnterpriseContractBillingEvent.mockResolvedValue({
      outcome: 'duplicate',
      matched: true,
      contractId: '11111111-1111-4111-8111-111111111111',
      organizationId: 'org_a',
      previousStatus: 'active',
      appliedStatus: 'active',
      billingStatus: 'active',
      version: 2,
    });

    const response = await POST(makePostRequest('t=1800000000,v1=good'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      enterprise: true,
      skipped: true,
      duplicate: true,
    }));
    expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
  });

  it('returns retryable 500 and does not fall through when Enterprise reconciliation fails', async () => {
    const event = makeStripeEvent();
    mocks.constructEvent.mockReturnValue(event);
    mocks.syncEnterpriseContractBillingEvent.mockRejectedValue(new Error('enterprise_billing_sync_unavailable'));

    const response = await POST(makePostRequest('t=1800000000,v1=good'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'webhook_processing_failed' });
    expect(mocks.syncStripeSubscriptionForInvoiceEvent).not.toHaveBeenCalled();
    expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_rejected',
        entityId: 'evt_valid',
        metadata: expect.objectContaining({ reason: 'enterprise_billing_sync_failed' }),
      }),
    );
  });

  it('audits unmatched events and dispatches self-service only after Enterprise routing', async () => {
    const event = makeStripeEvent();
    mocks.constructEvent.mockReturnValue(event);

    const response = await POST(makePostRequest('t=1800000000,v1=good'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, skipped: false, duplicate: false, unsupported: false });
    expect(mocks.syncEnterpriseContractBillingEvent).toHaveBeenCalledWith(event);
    expect(mocks.syncStripeSubscriptionForInvoiceEvent).toHaveBeenCalledWith(event);
    expect(mocks.handleStripeWebhookEventWithRecovery).toHaveBeenCalledWith(event);
    expect(mocks.syncEnterpriseContractBillingEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.syncStripeSubscriptionForInvoiceEvent.mock.invocationCallOrder[0],
    );
    expect(mocks.syncStripeSubscriptionForInvoiceEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.handleStripeWebhookEventWithRecovery.mock.invocationCallOrder[0],
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_received',
        organizationId: 'org_a',
        userId: 'user_admin',
        entityId: 'evt_valid',
        metadata: expect.objectContaining({ route: '/api/stripe/webhook', stripeEventId: 'evt_valid', stripeEventType: 'customer.subscription.updated' }),
      }),
    );
  });

  it('returns retryable server errors for verified self-service processing failures', async () => {
    const event = makeStripeEvent();
    mocks.constructEvent.mockReturnValue(event);
    mocks.handleStripeWebhookEventWithRecovery.mockRejectedValue(new Error('database temporarily unavailable'));

    const response = await POST(makePostRequest('t=1800000000,v1=good'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'webhook_processing_failed' });
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_rejected',
        entityId: 'evt_valid',
        metadata: expect.objectContaining({ route: '/api/stripe/webhook', reason: 'processing_failed' }),
      }),
    );
  });
});
