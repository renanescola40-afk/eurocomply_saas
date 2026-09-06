import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906005000_billing_initial_checkout_singleflight.sql',
  'utf8',
);
const helper = readFileSync('src/server/billing/initial-checkout-singleflight.ts', 'utf8');
const route = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');

describe('initial billing checkout singleflight', () => {
  it('serializes checkout ownership per organization in PostgreSQL', () => {
    expect(migration).toContain('organization_id uuid primary key');
    expect(migration).toContain("pg_advisory_xact_lock(hashtext('billing-checkout:' || p_organization_id::text))");
    expect(migration).toContain("case when v_existing.plan = v_plan then 'existing' else 'busy' end");
    expect(migration).toContain("status = 'claimed'");
    expect(migration).toContain("status = 'open'");
  });

  it('keeps the claim short when a worker dies before creating Stripe Checkout', () => {
    expect(helper).toContain('INITIAL_CHECKOUT_CLAIM_MS = 2 * 60 * 1000');
    expect(migration).toContain("p_claim_expires_at > now() + interval '5 minutes'");
  });

  it('keeps browser roles away from checkout lease mutation RPCs', () => {
    for (const signature of [
      'claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz)',
      'bind_initial_billing_checkout_session_atomic(uuid,uuid,text,timestamptz)',
      'release_initial_billing_checkout_atomic(uuid,uuid)',
      'clear_initial_billing_checkout_by_session_atomic(text)',
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature} from public, anon, authenticated`);
      expect(migration).toContain(`grant execute on function public.${signature} to service_role`);
    }
  });

  it('reuses an open Stripe session and never relies only on client idempotency for multiple tabs', () => {
    expect(route).toContain('claimInitialCheckoutAttempt(organization.id, plan)');
    expect(route).toContain('stripe.checkout.sessions.retrieve(checkoutAttempt.stripeSessionId)');
    expect(route).toContain("existingSession.status === 'open'");
    expect(route).toContain('singleflightReused: true');
    expect(route).toContain('bindInitialCheckoutSession({');
    expect(route).toContain('expires_at: sessionExpiresAtSeconds');
  });
});
