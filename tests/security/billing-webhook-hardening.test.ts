import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stripeWebhookRoute = readFileSync(join(process.cwd(), 'src/app/api/stripe/webhook/route.ts'), 'utf8');
const billingWebhookRoute = readFileSync(join(process.cwd(), 'src/app/api/billing/webhook/route.ts'), 'utf8');
const boundedBodyReader = readFileSync(join(process.cwd(), 'src/server/security/read-bounded-request-body.ts'), 'utf8');
const webhookRoutes = [stripeWebhookRoute, billingWebhookRoute];

describe('billing webhook hardening invariants', () => {
  it('uses the shared streaming body bound and Stripe tolerance-based signature verification', () => {
    expect(stripeWebhookRoute).toContain('STRIPE_WEBHOOK_TOLERANCE_SECONDS');
    expect(stripeWebhookRoute).toContain('constructEvent(body, signature, webhookSecret, STRIPE_WEBHOOK_TOLERANCE_SECONDS)');
    expect(stripeWebhookRoute).toContain('readBoundedRequestBody(request, MAX_STRIPE_WEBHOOK_BYTES)');

    expect(billingWebhookRoute).toContain('BILLING_WEBHOOK_TOLERANCE_SECONDS');
    expect(billingWebhookRoute).toContain('constructEvent(body, providerSignature, providerSigningValue, BILLING_WEBHOOK_TOLERANCE_SECONDS)');
    expect(billingWebhookRoute).toContain('readBoundedRequestBody(request, MAX_BILLING_WEBHOOK_BYTES)');

    for (const route of webhookRoutes) {
      expect(route).toContain('content-length');
      expect(route).not.toContain('await request.text()');
      expect(route).not.toContain('request.json()');
      expect(route).not.toContain('request.body.getReader()');
    }
  });

  it('keeps byte counting and cancellation inside the audited shared reader', () => {
    const countIndex = boundedBodyReader.indexOf('totalBytes += value.byteLength');
    const limitIndex = boundedBodyReader.indexOf('totalBytes > maxBytes');
    const retainIndex = boundedBodyReader.indexOf('chunks.push(Buffer.from(value))');

    expect(boundedBodyReader).toContain('request.body.getReader()');
    expect(boundedBodyReader).toContain("reader.cancel('body_too_large')");
    expect(countIndex).toBeGreaterThan(-1);
    expect(limitIndex).toBeGreaterThan(countIndex);
    expect(retainIndex).toBeGreaterThan(limitIndex);
  });

  it('does not log raw signature validation errors', () => {
    expect(stripeWebhookRoute).toContain('Invalid Stripe webhook signature');
    expect(billingWebhookRoute).toContain('Invalid provider webhook signature');

    for (const route of webhookRoutes) {
      expect(route).not.toContain('catch (error) {\n    await record');
      expect(route).not.toContain("reportError(error, { area: 'stripe_webhook_signature' })");
      expect(route).not.toContain("reportError(error, { area: 'billing_stripe_webhook_signature' })");
    }
  });

  it('returns retryable 500 responses after verified processing failures', () => {
    for (const route of webhookRoutes) {
      expect(route).toContain('processing_failed');
      expect(route).toContain("{ error: 'webhook_processing_failed' }");
      expect(route).toContain('{ status: 500 }');
      expect(route).not.toContain("return noStoreJson({ error: 'invalid_webhook' }, { status: 400 });\n  }\n}");
    }
  });

  it('returns duplicate and unsupported flags from both webhook routes', () => {
    for (const route of webhookRoutes) {
      expect(route).toContain('duplicate: result.duplicate ?? false');
      expect(route).toContain('unsupported: result.unsupported ?? false');
    }
  });
});
