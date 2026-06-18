import { describe, expect, it } from 'vitest';
import { getStripeWebhookContentLength, readBoundedStripeWebhookBody } from './route';

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
