import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('auth and onboarding redirect invariants', () => {
  it('keeps authenticated public auth entries on localized onboarding instead of dashboard', () => {
    const middleware = readRepoFile('src/middleware.ts');

    expect(middleware).toContain("const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations'");
    expect(middleware).toContain("const AUTH_SUCCESS_PATH = '/onboarding'");
    expect(middleware).toContain('isAuthenticated && (isMarketingHome || isAuthEntry)');
    expect(middleware).toContain('AUTH_SUCCESS_PATH');
    expect(middleware).toContain('NextResponse.redirect(dashboardUrl)');
  });

  it('keeps unauthenticated dashboard users on login with a safe localized next value', () => {
    const dashboard = readRepoFile('src/app/[locale]/dashboard/organizations/page.tsx');
    const observability = readRepoFile('src/app/[locale]/dashboard/observability/page.tsx');

    expect(dashboard).toContain('getLoginPath(safeLocale, dashboardPath)');
    expect(dashboard).toContain('encodeURIComponent(nextPath)');
    expect(dashboard).toContain('`/${locale}/login?next=');
    expect(observability).toContain('getLoginPath(safeLocale, dashboardPath)');
    expect(observability).toContain('encodeURIComponent(nextPath)');
    expect(observability).toContain('`/${locale}/dashboard/observability`');
  });

  it('blocks every organization dashboard route until onboarding is completed from the shared layout', () => {
    const dashboard = readRepoFile('src/app/[locale]/dashboard/organizations/page.tsx');
    const dashboardLayout = readRepoFile('src/app/[locale]/dashboard/organizations/layout.tsx');
    const dashboardAccess = readRepoFile('src/server/queries/organization-dashboard-access.ts');
    const currentOrganization = readRepoFile('src/server/queries/current-organization.ts');

    expect(dashboard).not.toContain('getCurrentOrganizationForUser(user.id)');
    expect(dashboardLayout).toContain('getOrganizationDashboardRedirect(safeLocale)');
    expect(dashboardLayout).toContain("await import('next/navigation')");
    expect(dashboardLayout).toContain('navigation.redirect(redirectTarget)');
    expect(dashboardAccess).toContain('getCurrentOrganizationForUser(user.id)');
    expect(dashboardAccess).toContain('!currentOrganization || !currentOrganization.is_onboarding_completed');
    expect(dashboardAccess).toContain('`/${locale}/onboarding`');
    expect(currentOrganization).toContain('onboarding_status');
    expect(currentOrganization).toContain('onboarding_completed_at');
    expect(currentOrganization).toContain('isOrganizationOnboardingCompleted({');
  });

  it('blocks observability dashboard access until onboarding is completed', () => {
    const observability = readRepoFile('src/app/[locale]/dashboard/observability/page.tsx');

    expect(observability).toContain('getCurrentOrganizationForUser(user.id)');
    expect(observability).toContain('!currentOrganization || !currentOrganization.is_onboarding_completed');
    expect(observability).toContain('redirect(`/${safeLocale}/onboarding`)');
  });

  it('uses one completion predicate for dashboard and onboarding redirects', () => {
    const onboardingPage = readRepoFile('src/app/[locale]/onboarding/page.tsx');
    const onboardingQuery = readRepoFile('src/server/queries/onboarding.ts');
    const currentOrganization = readRepoFile('src/server/queries/current-organization.ts');

    expect(currentOrganization).toContain('export function isOrganizationOnboardingCompleted');
    expect(currentOrganization).toContain("normalizeOnboardingStatus(input.onboarding_status) === 'completed'");
    expect(currentOrganization).toContain('Boolean(input.onboarding_completed_at)');
    expect(onboardingQuery).toContain('isOrganizationOnboardingCompleted({');
    expect(onboardingQuery).toContain('isOnboardingCompleted:');
    expect(onboardingPage).toContain('initialState.organization?.isOnboardingCompleted');
    expect(onboardingPage).not.toContain("initialState.organization?.onboardingStatus === 'completed'");
  });

  it('does not mark onboarding as completed when schema or admin fallback data is incomplete', () => {
    const onboardingQuery = readRepoFile('src/server/queries/onboarding.ts');

    expect(onboardingQuery).not.toContain("onboardingStatus: 'completed' as const");
    expect(onboardingQuery).toContain('onboardingStatus: membership.onboarding_status');
    expect(onboardingQuery).toContain('isOnboardingCompleted: membership.is_onboarding_completed');
  });

  it('preserves only safe localized continuations and rejects open redirects', () => {
    const login = readRepoFile('src/app/[locale]/login/page.tsx');
    const signup = readRepoFile('src/app/[locale]/signup/page.tsx');

    expect(login).toContain("value.startsWith('//')");
    expect(login).toContain("value.includes('://')");
    expect(login).toContain('`/${locale}/onboarding`');
    expect(login).toContain('`/${locale}/dashboard/organizations`');
    expect(login).toContain('`/${locale}/dashboard/observability`');
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain('`/${locale}/onboarding`');
    expect(signup).toContain('`/${locale}/checkout`');
  });

  it('keeps pt and en covered through the shared locale guard', () => {
    const login = readRepoFile('src/app/[locale]/login/page.tsx');
    const signup = readRepoFile('src/app/[locale]/signup/page.tsx');
    const onboarding = readRepoFile('src/app/[locale]/onboarding/page.tsx');

    expect(login).toContain('locales.includes(localeParam as Locale)');
    expect(signup).toContain('locales.includes(locale as Locale)');
    expect(onboarding).toContain('locales.includes(locale as Locale)');
  });
});
