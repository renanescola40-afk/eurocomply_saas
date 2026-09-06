import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hotfix = readFileSync(
  'supabase/migrations/20260906006000_billing_completed_checkout_authority_guard.sql',
  'utf8',
);
const originalSingleflight = readFileSync(
  'supabase/migrations/20260906005000_billing_initial_checkout_singleflight.sql',
  'utf8',
);
const route = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');
const reconciliation = readFileSync('config/supabase-forward-reconciliation.json', 'utf8');

describe('completed Checkout activation authority guard', () => {
  it('keeps a bound Checkout attempt durable after its original Stripe expiry timestamp', () => {
    expect(originalSingleflight).toContain('billing_checkout_attempts');
    expect(hotfix).toContain("v_existing.status = 'open' or v_existing.lease_expires_at > now()");
    expect(hotfix).toContain('Never age a bound session out merely because its original expires_at passed');
  });

  it('does not release a completed Checkout session while the subscription webhook is pending', () => {
    const completed = route.indexOf("existingSession.status === 'complete'");
    const pending = route.indexOf("error: 'checkout_pending_activation'");
    const expired = route.indexOf("existingSession.status !== 'expired'");
    const release = route.indexOf("'billing_checkout_expired_session_release'");

    expect(completed).toBeGreaterThan(-1);
    expect(pending).toBeGreaterThan(completed);
    expect(expired).toBeGreaterThan(pending);
    expect(release).toBeGreaterThan(expired);
  });

  it('releases the durable attempt only after processed LIVE subscription authority is current', () => {
    expect(hotfix).toContain("new.status = 'processed'");
    expect(hotfix).toContain('new.livemode is true');
    expect(hotfix).toContain("new.type in ('customer.subscription.created','customer.subscription.updated')");
    expect(hotfix).toContain('app_private.has_commercial_authority(new.organization_id)');
    expect(hotfix).toContain('delete from public.billing_checkout_attempts attempt');
    expect(hotfix).toContain('where attempt.organization_id = new.organization_id');
    expect(hotfix).not.toContain("new.type = 'checkout.session.completed'");
  });

  it('does not let historical processed event presence alone release a newer attempt', () => {
    expect(hotfix).toContain("to_regprocedure('app_private.has_commercial_authority(uuid)')");
    expect(hotfix).toContain('where app_private.has_commercial_authority(attempt.organization_id)');
    expect(hotfix).toContain('Historical/replayed events alone are intentionally insufficient');
  });

  it('keeps the trigger function inaccessible to browser database roles', () => {
    expect(hotfix).toContain(
      'revoke all on function public.clear_initial_checkout_after_live_subscription_processed() from public, anon, authenticated',
    );
    expect(hotfix).toContain('clear_initial_checkout_after_live_subscription_processed on public.stripe_events_processed');
  });

  it('keeps both checkout migrations inside the only authorized forward-reconciliation set', () => {
    expect(reconciliation).toContain('20260906005000_billing_initial_checkout_singleflight.sql');
    expect(reconciliation).toContain('20260906006000_billing_completed_checkout_authority_guard.sql');
  });
});
