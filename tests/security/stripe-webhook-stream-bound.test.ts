import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8');

describe('Stripe webhook streaming body bound', () => {
  it('does not buffer the unbounded request body through Request.text()', () => {
    expect(routeSource).not.toContain('await request.text()');
  });

  it('counts streamed bytes before retaining each chunk', () => {
    const readIndex = routeSource.indexOf('await reader.read()');
    const countIndex = routeSource.indexOf('totalBytes += value.byteLength');
    const limitIndex = routeSource.indexOf('totalBytes > MAX_STRIPE_WEBHOOK_BYTES');
    const retainIndex = routeSource.indexOf('chunks.push(value)');

    expect(readIndex).toBeGreaterThan(-1);
    expect(countIndex).toBeGreaterThan(readIndex);
    expect(limitIndex).toBeGreaterThan(countIndex);
    expect(retainIndex).toBeGreaterThan(limitIndex);
  });

  it('cancels the stream and rejects once the byte limit is exceeded', () => {
    expect(routeSource).toContain("await reader.cancel('stripe_webhook_payload_too_large')");
    expect(routeSource).toMatch(/if \(totalBytes > MAX_STRIPE_WEBHOOK_BYTES\)[\s\S]*return null;/);
  });

  it('retains the declared content-length fast rejection', () => {
    expect(routeSource).toMatch(/contentLength !== null && contentLength > MAX_STRIPE_WEBHOOK_BYTES/);
  });
});
