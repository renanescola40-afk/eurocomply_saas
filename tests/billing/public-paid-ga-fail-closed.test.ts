import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkoutRoute = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');
const preflight = readFileSync('scripts/preflight.mjs', 'utf8');

describe('public paid GA checkout gate', () => {
  it('blocks new self-serve checkout until paid billing is explicitly enabled', () => {
    expect(checkoutRoute).toContain('RISCK_COMPLY_PAID_BILLING_REQUIRED');
    expect(checkoutRoute).toContain('RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID');
    expect(checkoutRoute).toContain("{ error: 'public_paid_ga_not_enabled' }");
  });

  it('uses the same exact fail-closed boolean semantics as release preflight', () => {
    expect(checkoutRoute).toContain("process.env.RISCK_COMPLY_PAID_BILLING_REQUIRED === 'true'");
    expect(checkoutRoute).not.toContain('RISCK_COMPLY_PAID_BILLING_REQUIRED?.trim().toLowerCase()');
    expect(preflight).toContain("process.env[paidBillingRequiredEnv] === 'true'");
  });

  it('keeps existing legitimate subscriber lifecycle available while gating only initial checkout', () => {
    const existingLifecycle = checkoutRoute.indexOf('if (hasLiveSubscription) {');
    const gaGate = checkoutRoute.indexOf('const publicPaidBillingEnabled');
    const initialCheckout = checkoutRoute.indexOf('let checkoutAttempt = await claimInitialCheckoutAttempt');

    expect(existingLifecycle).toBeGreaterThan(-1);
    expect(gaGate).toBeGreaterThan(existingLifecycle);
    expect(initialCheckout).toBeGreaterThan(gaGate);
  });
});
