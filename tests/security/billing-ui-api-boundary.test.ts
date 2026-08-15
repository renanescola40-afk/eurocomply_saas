import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const billingPageRoute = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/page.tsx'), 'utf8');
const billingPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx'), 'utf8');
const publicCheckoutPage = readFileSync(join(process.cwd(), 'src/app/[locale]/checkout/page.tsx'), 'utf8');
const enterpriseHome = readFileSync(join(process.cwd(), 'src/components/marketing/enterprise-home.tsx'), 'utf8');
const billingActionButton = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx'), 'utf8');
const billingCheckoutRoute = readFileSync(join(process.cwd(), 'src/app/api/billing/checkout/route.ts'), 'utf8');
const billingPortalRoute = readFileSync(join(process.cwd(), 'src/app/api/billing/portal/route.ts'), 'utf8');
const legacyBillingActionsPath = join(process.cwd(), 'src/server/actions/billing.ts');

describe('billing UI API boundary', () => {
  it('does not import the old billing action helper from billing UI pages', () => {
    expect(billingPage).not.toContain('@/server/actions/billing');
    expect(publicCheckoutPage).not.toContain('@/server/actions/billing');
    expect(billingPage).toContain('./billing-action-button');
    expect(publicCheckoutPage).toContain('billing-action-button');
  });

  it('keeps the billing action client browser-safe', () => {
    expect(billingActionButton).toContain("'use client'");
    expect(billingActionButton).not.toContain('@/server/');
    expect(billingActionButton).not.toContain('@/lib/supabase/admin');
    expect(billingActionButton).not.toContain('node:crypto');
  });

  it('routes checkout and portal actions through API endpoints', () => {
    expect(billingActionButton).toContain("'/api/billing/checkout'");
    expect(billingActionButton).toContain('/api/billing/portal?locale=');
    expect(billingActionButton).toContain('returnPath=');
    expect(billingActionButton).toContain("method: 'POST'");
    expect(billingActionButton).toContain("action === 'checkout' ? JSON.stringify({ plan: planId, locale }) : undefined");
  });

  it('keeps public pricing buttons aligned with the canonical checkout page', () => {
    expect(enterpriseHome).toContain('BILLING_PLANS');
    expect(enterpriseHome).toContain('/checkout?plan=');
    expect(enterpriseHome).toContain('checkoutHref(activeLocale, plan.id)');
    expect(enterpriseHome).not.toContain('/billing/checkout/');
    expect(enterpriseHome).not.toContain("planKey: 'business'");
  });

  it('keeps the selected plan through account creation and onboarding before checkout', () => {
    expect(publicCheckoutPage).toContain('checkoutContinuationPath');
    expect(publicCheckoutPage).toContain('next=${encodeURIComponent(checkoutContinuationPath)}');
    expect(publicCheckoutPage).toContain('const onboardingPath = `/${locale}/onboarding?plan=${encodeURIComponent(selectedPlan.id)}`');
    expect(publicCheckoutPage).not.toContain('/onboarding?next=');
  });

  it('keeps checkout session creation ready for European B2B billing', () => {
    expect(billingCheckoutRoute).toContain('locale,');
    expect(billingCheckoutRoute).toContain("cancel_url: `${returnBaseUrl.appUrl}/${locale}/checkout?plan=${plan}&checkout=cancelled`");
    expect(billingCheckoutRoute).toContain("billing_address_collection: 'required'");
    expect(billingCheckoutRoute).toContain('customer_update');
    expect(billingCheckoutRoute).toContain('tax_id_collection');
    expect(billingCheckoutRoute).toContain("payment_method_collection: 'always'");
    expect(billingCheckoutRoute).toContain('allow_promotion_codes: true');
  });

  it('keeps Stripe portal returns scoped to the billing dashboard route', () => {
    expect(billingPortalRoute).toContain("DEFAULT_BILLING_RETURN_PATH = '/dashboard/organizations/billing'");
    expect(billingPortalRoute).toContain('returnPath');
    expect(billingPortalRoute).toContain('^\\/dashboard\\/organizations\\/billing');
    expect(billingPortalRoute).not.toContain('/settings/billing');
  });

  it('handles manage_billing step-up tokens before retrying billing mutations', () => {
    expect(billingActionButton).toContain("json.error === 'step_up_required'");
    expect(billingActionButton).toContain("'/api/security/step-up/challenge'");
    expect(billingActionButton).toContain("'/api/security/step-up/verify'");
    expect(billingActionButton).toContain('STEP_UP_TOKEN_HEADER');
    expect(billingActionButton).toContain("action: 'manage_billing'");
  });

  it('keeps non-owner billing UX read-only before a protected mutation is attempted', () => {
    expect(billingPageRoute).toContain('canManageDashboardBilling(organization.role)');
    expect(billingPageRoute).toContain('canManageBilling={canManageBilling}');
    expect(billingPage).toContain('canManageBilling: boolean');
    expect(billingPage).toContain('Billing is read-only for your role');
    expect(billingPage).toContain('Only the workspace owner can open the billing portal or change subscription plans');
    expect(billingPage).toContain('Owner access required');
    expect(billingPage).toContain('Owner action required');
    expect(billingPage).toContain('canManageBilling ? (');
  });

  it('does not present failed-payment subscriptions as a healthy current plan', () => {
    expect(publicCheckoutPage).toContain("const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])");
    expect(publicCheckoutPage).toContain("const PAYMENT_RECOVERY_STATUSES = new Set(['past_due', 'unpaid', 'incomplete'])");
    expect(publicCheckoutPage).toContain('const needsPaymentRecovery = hasStatus(billing?.status, PAYMENT_RECOVERY_STATUSES)');
    expect(publicCheckoutPage).toContain('needsPaymentRecovery && organization');
    expect(publicCheckoutPage).toContain('BillingActionButton action="portal"');
    expect(publicCheckoutPage).toContain('paymentRecoveryCopy');
    expect(publicCheckoutPage).not.toContain('CURRENT_PLAN_BLOCKING_STATUSES');
  });

  it('keeps billing-action failures on checkout when the dashboard is access-gated', () => {
    expect(billingActionButton).toContain("window.location.pathname === `/${locale}/checkout`");
    expect(billingActionButton).toContain("checkoutUrl.searchParams.set('checkout', 'error')");
    expect(billingActionButton).toContain('window.location.href = `${checkoutUrl.pathname}${checkoutUrl.search}`');
  });

  it('has no legacy billing action helper file', () => {
    expect(existsSync(legacyBillingActionsPath)).toBe(false);
  });
});
