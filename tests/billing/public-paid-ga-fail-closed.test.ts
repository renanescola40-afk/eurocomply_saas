import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkoutRoute = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');
const preflight = readFileSync('scripts/preflight.mjs', 'utf8');
const envExample = readFileSync('.env.example', 'utf8');

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

  it('fails closed before any first-time checkout state claim or Stripe provider access', () => {
    const gaGate = checkoutRoute.indexOf('const publicPaidBillingEnabled');
    const gaDeny = checkoutRoute.indexOf("return noStoreJson({ error: 'public_paid_ga_not_enabled' }, { status: 503 });");
    const initialCheckout = checkoutRoute.indexOf('let checkoutAttempt = await claimInitialCheckoutAttempt');
    const stripeClient = checkoutRoute.indexOf('const stripe = getStripeClient()');
    const ensureCustomer = checkoutRoute.indexOf('await ensureOrganizationStripeCustomer');
    const createCheckout = checkoutRoute.indexOf('stripe.checkout.sessions.create');

    expect(gaGate).toBeGreaterThan(-1);
    expect(gaDeny).toBeGreaterThan(gaGate);
    expect(initialCheckout).toBeGreaterThan(gaDeny);
    expect(stripeClient).toBeGreaterThan(initialCheckout);
    expect(ensureCustomer).toBeGreaterThan(stripeClient);
    expect(createCheckout).toBeGreaterThan(ensureCustomer);
  });

  it('keeps the controlled validation organization override server-side only', () => {
    expect(envExample).toContain('RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID=');
    expect(envExample).not.toContain('NEXT_PUBLIC_RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID');
    expect(checkoutRoute).not.toContain('NEXT_PUBLIC_RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID');
  });
});
