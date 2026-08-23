import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ONBOARDING_PAGE = new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url);
const ONBOARDING_BOUNDARY = new URL('../../src/components/onboarding/onboarding-runtime-boundary.tsx', import.meta.url);
const BILLING_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/billing/page.tsx', import.meta.url);
const BILLING_VIEW = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', import.meta.url);
const BILLING_INTENT_BANNER = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-plan-intent-banner.tsx', import.meta.url);
const BILLING_ACTION_BUTTON = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const ORGANIZATION_DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/organizations/layout.tsx', import.meta.url);
const COMMERCIAL_ACCESS = new URL('../../src/server/security/commercial-access.ts', import.meta.url);
const COMMERCIAL_ROUTE_POLICY = new URL('../../src/lib/security/commercial-route-policy.ts', import.meta.url);
const CHECKOUT_INTENT = new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url);

describe('post-billing commercial customer journey closure', () => {
  it('hands pre-license onboarding to the billing recovery lane instead of a gated product route', async () => {
    const [page, boundary] = await Promise.all([
      readFile(ONBOARDING_PAGE, 'utf8'),
      readFile(ONBOARDING_BOUNDARY, 'utf8'),
    ]);

    expect(page).toContain("new URLSearchParams({ onboarding: 'payment_required' })");
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
    expect(page).toContain('async function requireLicensedOnboardingPageAccess');
    expect(page).toContain('authority = await getOrganizationBillingAuthority(input.organizationId);');
    expect(page).toContain('if (!authority.licensed)');
    expect(page).toContain('await requireLicensedOnboardingPageAccess({');
    expect(page).toContain('redirect(`/${safeLocale}/dashboard`);');
    expect(page).toContain('redirect(getBillingRecoveryPath(input.locale, input.planId));');
  });

  it('consumes the selected onboarding plan without treating query intent as commercial authority', async () => {
    const [page, banner] = await Promise.all([
      readFile(BILLING_PAGE, 'utf8'),
      readFile(BILLING_INTENT_BANNER, 'utf8'),
    ]);

    expect(page).toContain('plan?: string');
    expect(page).toContain('const selectedPlan = getBillingPlan(resolvedSearchParams.plan);');
    expect(page).toContain('<BillingPlanIntentBanner');
    expect(page).toContain('selectedPlan={selectedPlan}');

    expect(banner).toContain('action="checkout"');
    expect(banner).toContain('planId={selectedPlan.id}');
    expect(banner).toContain('selectedPlan.salesLed ?');
    expect(banner).toContain("href={`/${locale}/contact?intent=sales&plan=${selectedPlan.id}&source=onboarding`}");
    expect(banner).toContain('!canManageBilling ?');
    expect(banner).toContain('aria-disabled="true"');
    expect(banner).toContain('Commercial access is granted only after the normal checkout or sales-led activation completes.');
    expect(banner).not.toContain('licensed=true');
  });

  it('keeps the fail-closed commercial authority boundary intact while allowing recovery', async () => {
    const [layout, organizationLayout, access, policy, checkoutIntent] = await Promise.all([
      readFile(DASHBOARD_LAYOUT, 'utf8'),
      readFile(ORGANIZATION_DASHBOARD_LAYOUT, 'utf8'),
      readFile(COMMERCIAL_ACCESS, 'utf8'),
      readFile(COMMERCIAL_ROUTE_POLICY, 'utf8'),
      readFile(CHECKOUT_INTENT, 'utf8'),
    ]);

    expect(layout).toContain('requireLicensedCommercialPageAccess');
    expect(layout).toContain("commercialRouteClass === 'billing_recovery'");
    expect(organizationLayout).toContain('classifyLocalizedCommercialRoute(pathname, safeLocale)');
    expect(organizationLayout).toContain("commercialRouteClass === 'billing_recovery'");
    expect(access).toContain('if (!authority.licensed)');
    expect(access).toContain("redirect(`/${input.locale}/pricing?billing=subscription_required`)");
    expect(policy).toContain("'/dashboard/billing'");
    expect(policy).toContain("'/dashboard/organizations/billing'");
    expect(policy).toContain("return 'licensed_product';");

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

  it('does not expose provider errors in recovery URLs or render query-controlled billing messages', async () => {
    const [page, actionButton] = await Promise.all([
      readFile(BILLING_PAGE, 'utf8'),
      readFile(BILLING_ACTION_BUTTON, 'utf8'),
    ]);

    expect(actionButton).toContain("const PUBLIC_BILLING_ERROR_CODE = 'action_failed';");
    expect(actionButton).toContain('billing_error=${PUBLIC_BILLING_ERROR_CODE}');
    expect(actionButton).not.toContain('encodeURIComponent(message)');
    expect(actionButton).not.toContain("String(json.error ?? 'Billing action could not be completed.')");

    expect(page).toContain('function getPublicBillingFailureMessage(locale: string)');
    expect(page).toContain('resolvedSearchParams.billing_error');
    expect(page).toContain('getPublicBillingFailureMessage(locale)');
    expect(page).not.toContain('billingError={resolvedSearchParams.billing_error}');
  });

  it('localizes customer-visible billing recovery and MFA step-up copy', async () => {
    const [view, actionButton] = await Promise.all([
      readFile(BILLING_VIEW, 'utf8'),
      readFile(BILLING_ACTION_BUTTON, 'utf8'),
    ]);

    expect(view).toContain("continueToDashboard: 'Continuar para o painel'");
    expect(view).toContain("continueToDashboard: 'Continuar al panel'");
    expect(view).toContain("continueToDashboard: 'Continuer vers le tableau de bord'");
    expect(view).toContain("continueToDashboard: 'Continua al pannello'");
    expect(view).toContain("ownerAccessRequired: 'Zugriff des Inhabers erforderlich'");
    expect(view).toContain("checkoutCompleted: 'Pagamento concluído'");
    expect(view).toContain("checkoutCompleted: 'Pago completado'");
    expect(view).toContain("checkoutCompleted: 'Paiement terminé'");
    expect(view).toContain("checkoutCompleted: 'Pagamento completato'");
    expect(view).toContain("checkoutCompleted: 'Zahlung abgeschlossen'");
    expect(view).not.toContain('owner do workspace');
    expect(view).not.toContain('owner del workspace');
    expect(view).not.toContain('owner du workspace');
    expect(view).not.toContain('owner del workspace');
    expect(view).not.toContain('Workspace-Owner');
    expect(view).not.toContain("checkoutCompleted: 'Checkout concluído'");
    expect(view).not.toContain("checkoutCompleted: 'Checkout completado'");
    expect(view).not.toContain("checkoutCompleted: 'Checkout terminé'");
    expect(view).not.toContain("checkoutCompleted: 'Checkout annullato'");

    expect(actionButton).toContain('function getStepUpCopy(locale: string)');
    expect(actionButton).toContain('Escolha um método de autenticação multifator');
    expect(actionButton).toContain('Elige un método de autenticación multifactor');
    expect(actionButton).toContain('Choisissez une méthode d’authentification multifacteur');
    expect(actionButton).toContain('Scegli un metodo di autenticazione a più fattori');
    expect(actionButton).toContain('Wählen Sie eine Methode für die Mehrfaktor-Authentifizierung');
    expect(actionButton).toContain('getBillingStepUpToken(locale)');
  });

  it('preserves role-safe billing UX and locale-aware activation navigation', async () => {
    const source = await readFile(BILLING_VIEW, 'utf8');

    expect(source).toContain('!canManageBilling ?');
    expect(source).toContain('aria-disabled="true"');
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("href={`/${locale}/dashboard`}");
    expect(source).toContain("continueToDashboard: 'Continue to dashboard'");
    expect(source).toContain("continueToDashboard: 'Continuar para o painel'");
    expect(source).toContain("continueToDashboard: 'Continuar al panel'");
    expect(source).toContain("continueToDashboard: 'Continuer vers le tableau de bord'");
    expect(source).toContain("continueToDashboard: 'Continua al pannello'");
    expect(source).toContain("continueToDashboard: 'Zum Dashboard'");
    expect(source).toContain('focus-visible:ring-2');
  });
});