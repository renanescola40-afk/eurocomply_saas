/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  recordSignedQaStripeTestEvent: vi.fn(),
  handleStripeWebhookEventWithRecovery: vi.fn(),
  syncStripeSubscriptionForInvoiceEvent: vi.fn(),
  syncEnterpriseContractBillingEvent: vi.fn(),
  getStripeEventAuditContext: vi.fn(() => ({ organizationId: 'org_a', actorUserId: 'user_admin', objectId: 'sub_123' })),
  reportError: vi.fn(),
  loggerWarn: vi.fn(),
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

vi.mock('@/server/billing/qa-stripe-test-ledger.mjs', () => ({
  recordSignedQaStripeTestEvent: mocks.recordSignedQaStripeTestEvent,
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

vi.mock('@/server/observability/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
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

function withQaEnv(run: () => Promise<void>) {
  const keys = ['RISCK_QA_ENVIRONMENT','VERCEL_ENV','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','SUPABASE_ADMIN_KEY','SUPABASE_SECRET_KEY'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.RISCK_QA_ENVIRONMENT = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
  for (const key of keys.slice(3)) delete process.env[key];
  return run().finally(() => { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
}

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
    mocks.recordSignedQaStripeTestEvent.mockRejectedValue(new Error('qa_stripe_writer_unavailable'));
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
    expect(mocks.reportError).not.toHaveBeenCalled();
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'stripe_webhook_signature_rejected',
      expect.objectContaining({
        area: 'stripe_webhook_signature',
        expectedSecurityRejection: true,
        route: '/api/stripe/webhook',
      }),
    );
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

  it('accepts only restricted QA signed TEST intake without processing entitlements', async () => {
    await withQaEnv(async () => {
      mocks.constructEvent.mockReturnValue(makeStripeEvent());
      mocks.recordSignedQaStripeTestEvent.mockResolvedValue({
        recorded: true,
        duplicate: false,
        status: 'processing',
      });

      const response = await POST(makePostRequest('t=1800000000,v1=good'));
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({
        received: true,
        intakeOnly: true,
        processed: false,
        duplicate: false,
      });
      expect(mocks.recordSignedQaStripeTestEvent).toHaveBeenCalledWith({
        rawBody: expect.any(String),
        signature: 't=1800000000,v1=good',
      });
      expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
      expect(mocks.syncStripeSubscriptionForInvoiceEvent).not.toHaveBeenCalled();
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
      expect(mocks.writeAuditLog).not.toHaveBeenCalled();
    });
  });

  it('acknowledges a duplicate QA intake claim without claiming fulfillment', async () => {
    await withQaEnv(async () => {
      mocks.constructEvent.mockReturnValue(makeStripeEvent());
      mocks.recordSignedQaStripeTestEvent.mockResolvedValue({
        recorded: false,
        duplicate: true,
        status: 'processed',
      });
      const response = await POST(makePostRequest('t=1800000000,v1=good'));
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({
        received: true,
        intakeOnly: true,
        processed: false,
        duplicate: true,
      });
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    });
  });

  it('keeps failed QA event intake retryable and never grants access', async () => {
    await withQaEnv(async () => {
      mocks.constructEvent.mockReturnValue(makeStripeEvent());
      mocks.recordSignedQaStripeTestEvent.mockResolvedValue({
        recorded: false,
        duplicate: true,
        status: 'failed',
      });
      const response = await POST(makePostRequest('t=1800000000,v1=good'));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'webhook_writer_unavailable' });
      expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    });
  });

  it('returns retryable 503 for signed TEST QA event while the scoped writer is unavailable', async () => {
    await withQaEnv(async () => {
      const event = makeStripeEvent();
      mocks.constructEvent.mockReturnValue(event);
      const response = await POST(makePostRequest('t=1800000000,v1=good'));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'webhook_writer_unavailable' });
      expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
      expect(mocks.syncStripeSubscriptionForInvoiceEvent).not.toHaveBeenCalled();
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
      expect(mocks.writeAuditLog).not.toHaveBeenCalled();
    });
  });

  it('does not persist a rejection audit for invalid QA webhook signatures', async () => {
    await withQaEnv(async () => {
      const response = await POST(makePostRequest());
      expect(response.status).toBe(400);
      expect(mocks.writeAuditLog).not.toHaveBeenCalled();
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    });
  });

  it('never writes a rejection audit if QA is misbound to a production database', async () => {
    await withQaEnv(async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://tganhbbhfxcpblmgqprg.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'unsafe_dummy_key_for_test_only';
      const event = makeStripeEvent();
      mocks.constructEvent.mockReturnValue(event);
      const response = await POST(makePostRequest('t=1800000000,v1=good'));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'webhook_writer_unavailable' });
      expect(mocks.writeAuditLog).not.toHaveBeenCalled();
      expect(mocks.syncEnterpriseContractBillingEvent).not.toHaveBeenCalled();
      expect(mocks.handleStripeWebhookEventWithRecovery).not.toHaveBeenCalled();
    });
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
