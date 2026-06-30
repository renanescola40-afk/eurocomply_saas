import { existsSync, readFileSync } from 'node:fs';
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

  it('keeps authenticated marketing and auth entry routes flowing through onboarding', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain("const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations'");
    expect(middleware).toContain("const AUTH_SUCCESS_PATH = '/onboarding'");
    expect(middleware).toContain("const AUTH_ENTRY_ROUTES = new Set(['/login', '/signup', '/register'])");
    expect(middleware).toContain('const shouldCheckAuth = !isPublic || isMarketingHome || isAuthEntry;');
    expect(middleware).toContain('isAuthenticated && (isMarketingHome || isAuthEntry)');
    expect(middleware).toContain('new URL(`/${locale}${AUTH_SUCCESS_PATH}`');
    expect(middleware).toContain('getSupabaseUserId');
  });

  it('keeps auth provider active and Clerk fallback URLs available only when enabled', () => {
    const layout = read('src/app/[locale]/layout.tsx');
    expect(layout).toContain('<AuthProvider>');
    expect(layout).toContain('const onboardingUrl = `/${safeLocale}/onboarding`;');
    expect(layout).toContain('signInFallbackRedirectUrl={onboardingUrl}');
    expect(layout).toContain('signUpFallbackRedirectUrl={onboardingUrl}');
  });

  it('uses Supabase for login buttons and keeps safe localized continuation', () => {
    const login = read('src/app/[locale]/login/page.tsx');
    expect(login).toContain('function successHref(locale: string, planId?: string | null)');
    expect(login).toContain('safeNext');
    expect(login).toContain('value.length > 240');
    expect(login).toContain("value.startsWith('//')");
    expect(login).toContain("value.includes('://')");
    expect(login).toContain('`/${locale}/onboarding`');
    expect(login).toContain('`/${locale}/dashboard/organizations`');
    expect(login).toContain('`/${locale}/checkout`');
    expect(login).toContain('supabase.auth.signInWithOAuth');
    expect(login).toContain("provider: 'google'");
    expect(login).toContain('supabase.auth.signInWithPassword');
    expect(login).not.toContain('useSignIn');
    expect(login).not.toContain('authenticateWithRedirect');
    expect(login).not.toContain('<SignIn');
  });

  it('keeps signup continuation guarded against unsafe next paths', () => {
    const signup = read('src/app/[locale]/signup/page.tsx');
    expect(signup).toContain('function getOnboardingHref(locale: string, planId?: string)');
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain('isAllowedLocalizedContinuation');
    expect(signup).toContain('`/${locale}/onboarding`');
    expect(signup).toContain('`/${locale}/checkout`');
    expect(signup).not.toContain('<SignUp');
    expect(signup).not.toContain('fallbackRedirectUrl={continuationHref}');
    expect(signup).not.toContain('forceRedirectUrl={continuationHref}');
  });

  it('keeps OAuth callback route available for Google redirects', () => {
    const middleware = read('src/middleware.ts');
    if (existsSync('src/app/[locale]/auth/callback/page.tsx')) {
      const callback = read('src/app/[locale]/auth/callback/page.tsx');
      expect(callback).toContain('exchangeCodeForSession');
      expect(middleware).toContain("'/auth/callback'");
      return;
    }
    const callback = read('src/app/[locale]/oauth/complete/page.tsx');
    expect(callback).toContain('AuthenticateWithRedirectCallback');
    expect(middleware).toContain("'/oauth/complete'");
  });

  it('keeps onboarding and organization dashboard routing in place', () => {
    const onboarding = read('src/app/[locale]/onboarding/page.tsx');
    const dashboard = read('src/app/[locale]/dashboard/organizations/page.tsx');
    expect(onboarding).toContain('getCurrentUser');
    expect(onboarding).toContain('B2BOnboardingFlow');
    expect(onboarding).toContain('redirect(`/${safeLocale}/dashboard/organizations${planQuery}`)');
    expect(dashboard).toContain('getCurrentUser');
    expect(dashboard).toContain('redirect(`/${safeLocale}/login`)');
    expect(dashboard).toContain('getOrganizationDashboardData');
    expect(dashboard).toContain('redirect(`/${safeLocale}/onboarding');
  });

  it('keeps workflow readiness wired through dashboard actions', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const overview = read('src/components/dashboard/dashboard-home-overview.tsx');
    const actions = read('src/components/dashboard/next-best-actions.tsx');
    expect(page).toContain('workflowReadiness={data.workflowReadiness}');
    expect(overview).toContain('workflowReadiness={workflowReadiness}');
    expect(actions).toContain('buildWorkflowReadinessAction');
    expect(actions).toContain('current workflow readiness');
  });
});
