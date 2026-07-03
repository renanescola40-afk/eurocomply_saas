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
    expect(middleware).toContain('`${locale}${AUTH_SUCCESS_PATH}`');
  });

  it('keeps unauthenticated dashboard users on login with a safe localized next value', () => {
    const dashboard = readRepoFile('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(dashboard).toContain('getLoginPath(safeLocale, dashboardPath)');
    expect(dashboard).toContain('encodeURIComponent(nextPath)');
    expect(dashboard).toContain("`/${locale}/login?next=");
  });

  it('blocks dashboard access until the organization onboarding is completed', () => {
    const dashboard = readRepoFile('src/app/[locale]/dashboard/organizations/page.tsx');
    const currentOrganization = readRepoFile('src/server/queries/current-organization.ts');

    expect(dashboard).toContain('getCurrentOrganizationForUser(user.id)');
    expect(dashboard).toContain('!currentOrganization || !currentOrganization.is_onboarding_completed');
    expect(dashboard).toContain("redirect(`/${safeLocale}/onboarding${requestedPlan}`)");
    expect(currentOrganization).toContain('onboarding_status');
    expect(currentOrganization).toContain('onboarding_completed_at');
    expect(currentOrganization).toContain("onboardingStatus === 'completed' && Boolean(onboardingCompletedAt)");
  });

  it('does not mark onboarding as completed when schema or admin fallback data is incomplete', () => {
    const onboardingQuery = readRepoFile('src/server/queries/onboarding.ts');

    expect(onboardingQuery).not.toContain("onboardingStatus: 'completed' as const");
    expect(onboardingQuery).toContain('onboardingStatus: membership.onboarding_status');
    expect(onboardingQuery).toContain("normalizeOnboardingStatus(organization.onboarding_status)");
  });

  it('preserves only safe localized continuations and rejects open redirects', () => {
    const login = readRepoFile('src/app/[locale]/login/page.tsx');
    const signup = readRepoFile('src/app/[locale]/signup/page.tsx');

    expect(login).toContain("value.startsWith('//')");
    expect(login).toContain("value.includes('://')");
    expect(login).toContain("`/${locale}/onboarding`");
    expect(login).toContain("`/${locale}/dashboard/organizations`");
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain("`/${locale}/onboarding`");
    expect(signup).toContain("`/${locale}/checkout`");
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
