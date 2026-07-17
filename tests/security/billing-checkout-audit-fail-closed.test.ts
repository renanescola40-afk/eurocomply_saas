import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');

describe('billing checkout audit persistence', () => {
  it('does not return a checkout URL when the audit event was not persisted', () => {
    const auditIndex = route.indexOf('const auditResult = await writeAuditLog');
    const persistenceGuardIndex = route.indexOf('if (!auditResult.persisted)');
    const responseIndex = route.indexOf('url: session.url');

    expect(auditIndex).toBeGreaterThan(-1);
    expect(persistenceGuardIndex).toBeGreaterThan(auditIndex);
    expect(responseIndex).toBeGreaterThan(persistenceGuardIndex);
    expect(route).toContain("error: 'checkout_audit_unavailable'");
    expect(route).toContain('{ status: 503 }');
  });

  it('attempts to expire the unusable Stripe session before failing closed', () => {
    expect(route).toContain('await stripe.checkout.sessions.expire(session.id)');
    expect(route).toContain("area: 'billing_checkout_audit_compensation'");
    expect(route).toContain("area: 'billing_checkout_audit'");
  });

  it('preserves the existing checkout security controls', () => {
    expect(route).toContain("permission: 'manage_billing'");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain("action: 'manage_billing'");
    expect(route).toContain('isSafeStripeCheckoutUrl(session.url)');
    expect(route).not.toContain('continue-on-error');
  });
});
