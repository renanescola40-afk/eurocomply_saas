import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkoutRoute = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');

describe('Stripe Checkout VAT contract', () => {
  it('requires billing identity and enables automatic tax calculation', () => {
    expect(checkoutRoute).toContain("billing_address_collection: 'required'");
    expect(checkoutRoute).toContain('tax_id_collection: { enabled: true }');
    expect(checkoutRoute).toContain('automatic_tax: { enabled: true }');
    expect(checkoutRoute).toContain("payment_method_collection: 'always'");
  });
});
