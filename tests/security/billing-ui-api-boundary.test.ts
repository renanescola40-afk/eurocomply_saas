import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const billingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx'), 'utf8');
const billingActionButton = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx'), 'utf8');
const legacyBillingActions = readFileSync(join(process.cwd(), 'src/server/actions/billing.ts'), 'utf8');

describe('billing UI API security boundary', () => {
  it('does not import legacy billing mutation server actions from the billing page', () => {
    expect(billingPage).not.toContain("@/server/actions/billing");
    expect(billingPage).toContain("./billing-action-button");
  });

  it('routes checkout and portal actions through hardened API endpoints', () => {
    expect(billingActionButton).toContain("'/api/billing/checkout'");
    expect(billingActionButton).toContain("'/api/billing/portal?locale=");
    expect(billingActionButton).toContain("method: 'POST'");
    expect(billingActionButton).toContain("action === 'checkout' ? JSON.stringify({ plan: planId, locale }) : undefined");
  });

  it('handles manage_billing step-up tokens before retrying billing mutations', () => {
    expect(billingActionButton).toContain("json.error === 'step_up_required'");
    expect(billingActionButton).toContain("'/api/security/step-up/challenge'");
    expect(billingActionButton).toContain("'/api/security/step-up/verify'");
    expect(billingActionButton).toContain('STEP_UP_TOKEN_HEADER');
    expect(billingActionButton).toContain("action: 'manage_billing'");
  });

  it('disables legacy server action billing mutations so future imports fail closed', () => {
    expect(legacyBillingActions).toContain('Billing mutations must go through the hardened /api/billing routes.');
    expect(legacyBillingActions).not.toContain('stripe.checkout.sessions.create');
    expect(legacyBillingActions).not.toContain('stripe.billingPortal.sessions.create');
  });
});
