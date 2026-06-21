/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  handleStripeWebhookEvent: vi.fn(),
  reportError: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
}));

vi.mock('@/lib/billing/stripe', () => ({
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
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

import { POST, STRIPE_WEBHOOK_TOLERANCE_SECONDS, getStripeWebhookContentLength, readBoundedStripeWebhookBody } from './route';

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

describe('Stripe webhook route signature validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });
  });

  it('always rejects invalid Stripe signatures and does not process the event', async () => {
    const response = await POST(makePostRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_webhook' });
    expect(mocks.handleStripeWebhookEvent).not.toHaveBeenCalled();
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      expect.any(String),
      't=1800000000,v1=bad',
      'whsec_test_secret',
      STRIPE_WEBHOOK_TOLERANCE_SECONDS,
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
    expect(mocks.handleStripeWebhookEvent).not.toHaveBeenCalled();
  });
});
