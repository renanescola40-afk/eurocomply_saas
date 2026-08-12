import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('enterprise billing lifecycle idempotency contract', () => {
  it('requires idempotency on all browser-created Stripe sessions', () => {
    const checkout = read('src/app/api/billing/checkout/route.ts');
    const portal = read('src/app/api/billing/portal/route.ts');
    const button = read('src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx');

    expect(checkout).toContain("scope: 'checkout'");
    expect(checkout).toContain("deriveStripeIdempotencyKey(idempotency.context, 'customer-create')");
    expect(checkout).toContain("deriveStripeIdempotencyKey(idempotency.context, 'checkout-session')");
    expect(portal).toContain("scope: 'portal'");
    expect(portal).toContain("deriveStripeIdempotencyKey(idempotency.context, 'portal-session')");
    expect(button).toContain('crypto.randomUUID()');
    expect(button).toContain("const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key'");
  });

  it('serializes subscription changes through the protected lifecycle ledger', () => {
    const route = read('src/app/api/billing/subscription/route.ts');
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const ledger = read('src/server/billing/lifecycle-request-ledger.ts');
    const migration = read('supabase/migrations/20260728170000_billing_lifecycle_requests.sql');

    expect(route).toContain("scope: 'subscription'");
    expect(route).toContain("permission: 'manage_billing'");
    expect(route).toContain('requireStepUpForRequest');
    expect(lifecycle).toContain('claimBillingLifecycleRequest');
    expect(lifecycle).toContain('completeBillingLifecycleRequest');
    expect(lifecycle).toContain('failBillingLifecycleRequest');
    expect(lifecycle).toContain("deriveStripeIdempotencyKey(input.idempotency, `subscription-${input.action}`)");
    expect(ledger).toContain("stripe_request_id: input.requestDigest");
    expect(ledger).toContain("status: 'processing'");
    expect(ledger).toContain('isBillingLifecycleLeaseStale');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on public.billing_lifecycle_requests from anon, authenticated');
  });

  it('fails closed on Stripe customer or tenant authority mismatch and preserves annual interval by default', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');

    expect(lifecycle).toContain('stripe_subscription_customer_mismatch');
    expect(lifecycle).toContain('stripe_subscription_organization_mismatch');
    expect(lifecycle).toContain("input.interval ? normalizeBillingInterval(input.interval) : getCurrentBillingInterval(baseItem)");
    expect(lifecycle).toContain("baseItem.price.recurring?.interval === 'year' ? 'year' : 'month'");
  });
});
