import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkoutRoute = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');
const activationRoute = readFileSync('src/app/api/billing/checkout/activation/route.ts', 'utf8');
const activationClient = readFileSync('src/app/[locale]/checkout/complete/checkout-activation-client.tsx', 'utf8');

describe('post-checkout activation handoff', () => {
  it('returns successful Stripe Checkout to a bounded confirmation surface instead of the protected dashboard', () => {
    expect(checkoutRoute).toContain('success_url: `${returnBaseUrl.appUrl}/${locale}/checkout/complete`');
    expect(checkoutRoute).not.toContain('dashboard/organizations?checkout=success');
  });

  it('requires active persisted status, exact Stripe ids and processed live Stripe authority before activation', () => {
    expect(activationRoute).toContain(".from('subscriptions')");
    expect(activationRoute).toContain("new Set(['active'])");
    expect(activationRoute).not.toContain("new Set(['active', 'trialing'])");
    expect(activationRoute).toContain('stripe_customer_id');
    expect(activationRoute).toContain('stripe_subscription_id');
    expect(activationRoute).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(activationRoute).toContain("authority: 'processed_live_stripe_subscription_event'");
    expect(activationRoute).toContain('const activated = hasActivatableStatus && hasCanonicalStripeBinding && liveStripeAuthority');
    expect(activationRoute).not.toContain('searchParams');
    expect(activationRoute).not.toContain('checkout=success');
    expect(activationRoute).not.toContain('session_id');
    expect(activationRoute).not.toContain('subscriptions.update');
    expect(activationRoute).not.toContain('subscriptions.create');
  });

  it('keeps delayed activation fail-closed and bounded', () => {
    expect(activationClient).toContain('const MAX_WAIT_MS = 30000');
    expect(activationClient).toContain("data.state === 'activated'");
    expect(activationClient).toContain("window.location.replace(`/${locale}${data.next ?? '/dashboard/organizations'}`)");
    expect(activationClient).toContain('You do not need to pay again.');
    expect(activationClient).toContain('O acesso não foi concedido apenas pelo retorno do navegador.');
    expect(activationClient).not.toContain('checkout=success');
  });

  it('does not turn a transient backend failure into paid access', () => {
    const catchIndex = activationClient.indexOf('} catch {');
    const activatedRedirectIndex = activationClient.indexOf("data.state === 'activated'");
    expect(catchIndex).toBeGreaterThan(activatedRedirectIndex);
    expect(activationClient).toContain('must never be converted into paid access');
  });
});
