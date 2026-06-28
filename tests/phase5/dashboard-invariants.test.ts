import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 5 dashboard invariants', () => {
  it('keeps root traffic redirected to the default localized entrypoint', () => {
    const content = read('src/app/page.tsx');

    expect(content).toContain('redirect');
    expect(content).toContain("'/pt'");
  });

  it('keeps localized home static while middleware handles authenticated redirects safely', () => {
    const home = read('src/app/[locale]/page.tsx');
    const middleware = read('src/middleware.ts');

    expect(home).toContain('force-static');
    expect(home).toContain('revalidate = 300');
    expect(home).toContain('EnterpriseHome');
    expect(middleware).toContain('shouldCheckMarketingHomeAuth');
    expect(middleware).toContain('ORGANIZATION_DASHBOARD_PATH');
    expect(middleware).toContain('withPrivateNoStore');
  });

  it('keeps authenticated public auth entrypoints routed through onboarding first', () => {
    const middleware = read('src/middleware.ts');

    expect(middleware).toContain("const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations'");
    expect(middleware).toContain("const AUTH_SUCCESS_PATH = '/onboarding'");
    expect(middleware).toContain('isAuthenticated && (isAuthEntryRoute || isMarketingHome)');
    expect(middleware).toContain('new URL(`/${locale}${AUTH_SUCCESS_PATH}`');
  });

  it('keeps Clerk post-auth fallback URLs pointed at localized onboarding', () => {
    const layout = read('src/app/[locale]/layout.tsx');

    expect(layout).toContain('const onboardingUrl = `/${safeLocale}/onboarding`;');
    expect(layout).toContain('signInFallbackRedirectUrl={onboardingUrl}');
    expect(layout).toContain('signUpFallbackRedirectUrl={onboardingUrl}');
  });

  it('keeps login success fallback on onboarding while preserving safe next validation', () => {
    const login = read('src/app/[locale]/login/page.tsx');

    expect(login).toContain('function getAuthSuccessHref(locale: string)');
    expect(login).toContain('return `/${locale}/onboarding`;');
    expect(login).toContain('const fallback = getAuthSuccessHref(locale);');
    expect(login).toContain("next.includes('://')");
    expect(login).toContain("next.startsWith('//')");
    expect(login).toContain('fallbackRedirectUrl={afterSignInUrl}');
    expect(login).toContain('forceRedirectUrl={afterSignInUrl}');
  });

  it('keeps signup continuation defaulted to onboarding with open redirect guards', () => {
    const signup = read('src/app/[locale]/signup/page.tsx');

    expect(signup).toContain('function getOnboardingHref(locale: string, planId?: string)');
    expect(signup).toContain('const baseHref = `/${locale}/onboarding`;');
    expect(signup).toContain('const fallbackHref = getOnboardingHref(locale, planId);');
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain('fallbackRedirectUrl={continuationHref}');
    expect(signup).toContain('forceRedirectUrl={continuationHref}');
  });

  it('keeps onboarding as the organization decision point', () => {
    const onboarding = read('src/app/[locale]/onboarding/page.tsx');

    expect(onboarding).toContain('getCurrentUser');
    expect(onboarding).toContain('getCurrentOrganizationForUser');
    expect(onboarding).toContain('CreateOrganizationForm');
    expect(onboarding).toContain('createOrganization(input, currentUser.id, currentUser.email)');
    expect(onboarding).toContain('redirect(`/${locale}/dashboard/organizations${planQuery}`)');
    expect(onboarding).toContain('redirect(`/${locale}/login?next=');
  });

  it('keeps organization dashboard auth and onboarding routing in place', () => {
    const content = read('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(content).toContain('getCurrentUser');
    expect(content).toContain('redirect(`/${safeLocale}/login`)');
    expect(content).toContain('getOrganizationDashboardData');
    expect(content).toContain('redirect(`/${safeLocale}/onboarding');
  });

  it('passes workflow readiness from the organization page into dashboard overview', () => {
    const content = read('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(content).toContain('workflowReadiness={data.workflowReadiness}');
  });

  it('passes workflow readiness from dashboard overview into next best actions', () => {
    const content = read('src/components/dashboard/dashboard-home-overview.tsx');

    expect(content).toContain('OrganizationWorkflowReadiness');
    expect(content).toContain('workflowReadiness?: OrganizationWorkflowReadiness');
    expect(content).toContain('workflowReadiness={workflowReadiness}');
    expect(content).toContain('NextBestActions');
  });

  it('uses workflow readiness to prioritize next best actions', () => {
    const content = read('src/components/dashboard/next-best-actions.tsx');

    expect(content).toContain('OrganizationWorkflowReadiness');
    expect(content).toContain('buildWorkflowReadinessAction');
    expect(content).toContain('Stabilize blocked workflow readiness');
    expect(content).toContain('Resolve workflow readiness blockers');
    expect(content).toContain('Capture workflow readiness evidence');
    expect(content).toContain('current workflow readiness');
  });

  it('keeps dashboard data scoped by organization id', () => {
    const content = read('src/server/queries/organization-dashboard.ts');

    expect(content).toContain('getCurrentOrganizationForUser');
    expect(content).toContain('organization.id');
    expect(content).toContain("eq('organization_id', organizationId)");
    expect(content).toContain("from('compliance_tasks')");
    expect(content).toContain("from('risks')");
    expect(content).toContain("from('vendors')");
    expect(content).toContain("from('documents')");
  });

  it('keeps dashboard data available once a user has an organization membership', () => {
    const content = read('src/server/queries/organization-dashboard.ts');

    expect(content).toContain('if (!organization)');
    expect(content).toContain('return null');
    expect(content).toContain('const fallbackEntitlements = getPlanEntitlements');
    expect(content).toContain('withDashboardTimeout');
    expect(content).toContain('return {');
    expect(content).toContain('organization: normalizeOrganization(organization)');
  });

  it('exposes derived workflow readiness for organization workflows', () => {
    const content = read('src/server/queries/organization-dashboard.ts');

    expect(content).toContain('OrganizationWorkflowReadiness');
    expect(content).toContain('getOrganizationWorkflowReadiness');
    expect(content).toContain('workflowReadiness');
    expect(content).toContain('risk-review-required');
    expect(content).toContain('open-compliance-work');
    expect(content).toContain('vendor-review-required');
    expect(content).toContain('evidence-review-required');
    expect(content).toContain('ready-for-executive-review');
  });

  it('keeps current organization resolution scoped to user membership', () => {
    const content = read('src/server/queries/current-organization.ts');

    expect(content).toContain("from('organization_members')");
    expect(content).toContain("eq('user_id', userId)");
    expect(content).toContain('getCurrentOrganizationForUser');
    expect(content).toContain('membership.slug === slug');
  });
});
