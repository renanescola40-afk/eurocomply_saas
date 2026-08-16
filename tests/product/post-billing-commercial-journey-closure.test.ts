import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ONBOARDING_PAGE = new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url);
const ONBOARDING_BOUNDARY = new URL('../../src/components/onboarding/onboarding-runtime-boundary.tsx', import.meta.url);
const BILLING_VIEW = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const CHECKOUT_INTENT = new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url);

describe('post-billing commercial customer journey closure', () => {
  it('hands fresh completed onboarding to the billing recovery lane instead of a gated product route', async () => {
    const [page, boundary] = await Promise.all([
      readFile(ONBOARDING_PAGE, 'utf8'),
      readFile(ONBOARDING_BOUNDARY, 'utf8'),
    ]);

    expect(page).toContain("new URLSearchParams({ onboarding: 'completed' })");
    expect(page).toContain("return `/${locale}/dashboard/organizations/billing?${query.toString()}`;");
    expect(page).toContain('redirect(getBillingRecoveryPath(safeLocale, resolvedSearchParams.plan));');
    expect(page).not.toContain('redirect(`/${safeLocale}/dashboard/organizations${planQuery}`);');

    expect(boundary).toContain("onboarding: 'completed'");
    expect(boundary).toContain("dashboardPath: getBillingRecoveryPath(locale, input.selectedPlan)");
    expect(boundary).toContain('/dashboard/organizations/billing?');
  });

  it('routes a returning licensed subscriber directly back into the product', async () => {
    const page = await readFile(ONBOARDING_PAGE, 'utf8');

    expect(page).toContain("import { getOrganizationBillingAuthority } from '@/server/queries/subscription';");
    expect(page).toContain('const authority = await getOrganizationBillingAuthority(initialState.organization.id);');
    expect(page).toContain('if (authority.licensed)');
    expect(page).toContain('redirect(`/${safeLocale}/dashboard`);');
    expect(page).toContain('redirect(getBillingRecoveryPath(safeLocale, resolvedSearchParams.plan));');
  });

  it('keeps the fail-closed commercial authority boundary intact while allowing recovery', async () => {
    const [layout, checkoutIntent] = await Promise.all([
      readFile(DASHBOARD_LAYOUT, 'utf8'),
      readFile(CHECKOUT_INTENT, 'utf8'),
    ]);

    expect(layout).toContain('if (!authority.licensed)');
    expect(layout).toContain("`/${locale}/dashboard/billing`");
    expect(layout).toContain("`/${locale}/dashboard/organizations/billing`");
    expect(layout).toContain("redirect(`/${locale}/pricing?billing=subscription_required`)");

    expect(checkoutIntent).toContain('const alreadyOnPlan = entitlements.licensed &&');
    expect(checkoutIntent).toContain('checkoutReady: !plan.salesLed');
  });

  it('never represents the catalog fallback as an active subscription', async () => {
    const source = await readFile(BILLING_VIEW, 'utf8');

    expect(source).toContain("const hasActivePlan = billing.status === 'active' || billing.status === 'trialing';");
    expect(source).toContain('const hasSubscriptionRecord = billing.status !== null;');
    expect(source).toContain('{hasActivePlan ? currentPlan.name : copy.noActiveSubscription}');
    expect(source).toContain('const isCurrent = hasActivePlan && plan.id === currentPlan.id;');
    expect(source).not.toContain('const isCurrent = plan.id === currentPlan.id;');
  });

  it('keeps payment recovery available without opening a portal for a brand-new organization', async () => {
    const source = await readFile(BILLING_VIEW, 'utf8');

    expect(source).toContain('canManageBilling && hasSubscriptionRecord');
    expect(source).toContain('action="portal"');
    expect(source).toContain('action="checkout"');
    expect(source).toContain('disabled={isCurrent}');
    expect(source).toContain("past_due: 'Past due'");
    expect(source).toContain("unpaid: 'Unpaid'");
    expect(source).toContain("canceled: 'Canceled'");
    expect(source).toContain("incomplete: 'Incomplete'");
  });

  it('preserves role-safe billing UX and locale-aware activation navigation', async () => {
    const source = await readFile(BILLING_VIEW, 'utf8');

    expect(source).toContain('!canManageBilling ?');
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("href={`/${locale}/dashboard`}");
    expect(source).toContain("continueToDashboard: 'Continue to dashboard'");
    expect(source).toContain("continueToDashboard: 'Continuar para o dashboard'");
    expect(source).toContain("continueToDashboard: 'Continuar al dashboard'");
    expect(source).toContain("continueToDashboard: 'Continuer vers le tableau de bord'");
    expect(source).toContain("continueToDashboard: 'Continua alla dashboard'");
    expect(source).toContain("continueToDashboard: 'Zum Dashboard'");
    expect(source).toContain('focus-visible:ring-2');
  });
});
