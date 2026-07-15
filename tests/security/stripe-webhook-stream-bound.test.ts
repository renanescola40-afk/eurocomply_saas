import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stripeRouteSource = readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8');
const billingRouteSource = readFileSync('src/app/api/billing/webhook/route.ts', 'utf8');
const boundedBodyReaderSource = readFileSync('src/server/security/read-bounded-request-body.ts', 'utf8');

describe('Stripe webhook streaming body bound', () => {
  it('does not buffer either webhook through Request.text()', () => {
    expect(stripeRouteSource).not.toContain('await request.text()');
    expect(billingRouteSource).not.toContain('await request.text()');
  });

  it('routes both webhook limits through the shared bounded reader', () => {
    expect(stripeRouteSource).toContain('readBoundedRequestBody(request, MAX_STRIPE_WEBHOOK_BYTES)');
    expect(billingRouteSource).toContain('readBoundedRequestBody(request, MAX_BILLING_WEBHOOK_BYTES)');
    expect(stripeRouteSource).not.toContain('request.body.getReader()');
    expect(billingRouteSource).not.toContain('request.body.getReader()');
  });

  it('counts streamed bytes before retaining each chunk', () => {
    const readIndex = boundedBodyReaderSource.indexOf('await reader.read()');
    const countIndex = boundedBodyReaderSource.indexOf('totalBytes += value.byteLength');
    const limitIndex = boundedBodyReaderSource.indexOf('totalBytes > maxBytes');
    const retainIndex = boundedBodyReaderSource.indexOf('chunks.push(Buffer.from(value))');

    expect(readIndex).toBeGreaterThan(-1);
    expect(countIndex).toBeGreaterThan(readIndex);
    expect(limitIndex).toBeGreaterThan(countIndex);
    expect(retainIndex).toBeGreaterThan(limitIndex);
  });

  it('cancels the stream and rejects once the byte limit is exceeded', () => {
    expect(boundedBodyReaderSource).toContain("await reader.cancel('body_too_large').catch(() => undefined)");
    expect(boundedBodyReaderSource).toMatch(/if \(totalBytes > maxBytes\)[\s\S]*return \{ error: 'body_too_large' \};/);
  });

  it('retains declared content-length fast rejection at both route boundaries', () => {
    expect(stripeRouteSource).toMatch(/contentLength !== null && contentLength > MAX_STRIPE_WEBHOOK_BYTES/);
    expect(billingRouteSource).toMatch(/contentLength !== null && contentLength > MAX_BILLING_WEBHOOK_BYTES/);
  });
});
