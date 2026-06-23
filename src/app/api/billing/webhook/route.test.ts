/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  handleStripeWebhookEvent: vi.fn(),
  reportError: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  getClientIpFromRequest: vi.fn(() => '203.0.113.10'),
  getUserAgentFromRequest: vi.fn(() => 'Vitest'),
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  }),
}));

vi.mock('@/server/billing/stripe-webhooks', () => ({
  handleStripeWebhookEvent: mocks.handleStripeWebhookEvent,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  getClientIpFromRequest: mocks.getClientIpFromRequest,
  getUserAgentFromRequest: mocks.getUserAgentFromRequest,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

import { BILLING_WEBHOOK_TOLERANCE_SECONDS, POST, getBillingWebhookContentLength, readBoundedBillingWebhookBody } from './route';

const TEST_STRIPE_WEBHOOK_SECRET = 'test_webhook_signing_secret';

function makeWebhookRequest(body: string, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.test/api/billing/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't=1800000000,v1=test',
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });
}

describe('legacy billing webhook route hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SEC_RET = TEST_STRIPE_WEBHOOK_SECRET;
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.handleStripeWebhookEvent.mockResolvedValue({ skipped: false });
  });

  it('parses safe finite content lengths only', () => {
    expect(getBillingWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '123' }))).toBe(123);
    expect(getBillingWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '-1' }))).toBeNull();
    expect(getBillingWebhookContentLength(makeWebhookRequest('{}', { 'content-length': 'NaN' }))).toBeNull();
    expect(getBillingWebhookContentLength(makeWebhookRequest('{}', { 'content-length': '1.5' }))).toBeNull();
  });

  it('rejects oversized webhook payloads', async () => {
    await expect(readBoundedBillingWebhookBody(makeWebhookRequest('{}', { 'content-length': '1000001' }))).resolves.toBeNull();
  });

  it('always rejects invalid Stripe signatures and does not process the event', async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const response = await POST(makeWebhookRequest(JSON.stringify({ id: 'evt_bad', type: 'customer.subscription.updated' }), { 'stripe-signature': 't=1800000000,v1=bad' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_webhook' });
    expect(mocks.handleStripeWebhookEvent).not.toHaveBeenCalled();
    expect(mocks.constructEvent).toHaveBeenCalledWith(expect.any(String), 't=1800000000,v1=bad', TEST_STRIPE_WEBHOOK_SECRET, BILLING_WEBHOOK_TOLERANCE_SECONDS);
  });

  it('routes valid legacy billing webhook events through the hardened idempotent handler', async () => {
    const event = { id: 'evt_ok', type: 'customer.subscription.updated', data: { object: {} } };
    mocks.constructEvent.mockReturnValue(event);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, skipped: false, duplicate: false, unsupported: false });
    expect(mocks.handleStripeWebhookEvent).toHaveBeenCalledWith(event);
  });

  it('fails closed when the Stripe signature header is missing', async () => {
    const response = await POST(
      new Request('https://app.eurocomply.test/api/billing/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'missing_signature' });
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expect(mocks.handleStripeWebhookEvent).not.toHaveBeenCalled();
  });
});
