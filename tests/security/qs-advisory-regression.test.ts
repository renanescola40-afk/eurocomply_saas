import { createRequire } from 'node:module';
import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const qs = require('qs') as {
  parse: (input: string, options?: Record<string, unknown>) => Record<string, unknown>;
  stringify: (input: Record<string, unknown>, options?: Record<string, unknown>) => string;
};

// GHSA-6pq8-jhm2-2vcw: exercise the locked production dependency, not a stub.
describe('production query serializer advisory regression', () => {
  for (const encodeValuesOnly of [false, true]) {
    it(`serializes hostile JSON without throwing (encodeValuesOnly=${encodeValuesOnly})`, () => {
      const hostile = JSON.parse('{"a":[{"toString":"x"}]}');
      expect(qs.stringify(hostile, { arrayFormat: 'comma', encodeValuesOnly }))
        .toBe('a=%5Bobject%20Object%5D');
    });

    it(`serializes prototype-shadowing query input without throwing (encodeValuesOnly=${encodeValuesOnly})`, () => {
      const hostile = qs.parse('a[0][toString]=x', { allowPrototypes: true });
      expect(qs.stringify(hostile, { arrayFormat: 'comma', encodeValuesOnly }))
        .toBe('a=%5Bobject%20Object%5D');
    });
  }

  it('preserves nested checkout parameters through the real Stripe SDK with an isolated transport', async () => {
    let serialized = '';
    const transport: typeof fetch = async (_url, init) => {
      serialized = String(init?.body);
      return new Response(JSON.stringify({ id: 'cs_test_synthetic', object: 'checkout.session' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
    const stripe = new Stripe('sk_test_qa', {
      httpClient: Stripe.createFetchHttpClient(transport), maxNetworkRetries: 0,
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: 'price_synthetic', quantity: 1 }],
      metadata: { organization_id: 'synthetic-org' },
    });
    expect(session.id).toBe('cs_test_synthetic');
    // Stripe deliberately restores literal brackets after qs encoding.
    expect(serialized).toBe('mode=subscription&line_items[0][price]=price_synthetic&line_items[0][quantity]=1&metadata[organization_id]=synthetic-org');
  });
});
