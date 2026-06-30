import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const signupNextPattern = 'signup?' + 'next=';
const loginNextPattern = 'login?' + 'next=';

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
  });

  it('keeps Clerk post-auth fallback URLs pointed at localized onboarding', () => {
    const layout = read('src/app/[locale]/layout.tsx');

    expect(layout).toContain('const onboardingUrl = `/${safeLocale}/onboarding`;');
    expect(layout).toContain('signInFallbackRedirectUrl={onboardingUrl}');
    expect(layout).toContain('signUpFallbackRedirectUrl={onboardingUrl}');
  });

  it('keeps login success fallback on onboarding while using a custom stable entry template', () => {
    const login = read('src/app/[locale]/login/page.tsx');

    expect(login).toContain('function getAuthSuccessHref(locale: string, planId?: string | null)');
    expect(login).toContain('const fallback = getAuthSuccessHref(locale, planId);');
    expect(login).toContain('normalizedNext.length > 240');
    expect(login).toContain("normalizedNext.includes('://')");
    expect(login).toContain("normalizedNext.startsWith('//')");
    expect(login).toContain('isSafeLocalizedContinuation');
    expect(login).toContain('`/${locale}/onboarding`');
    expect(login).toContain('`/${locale}/dashboard/organizations`');
    expect(login).toContain('`/${locale}/checkout`');
    expect(login).toContain('const signUpUrl = getSignUpHref(activeLocale, requestedPlanId, afterSignInUrl);');
    expect(login).toContain('useSignIn');
    expect(login).toContain('authenticateWithRedirect');
    expect(login).toContain('signIn.create({ identifier: email, password });');
    expect(login).not.toContain('<SignIn');
  });

  it('keeps signup continuation defaulted to onboarding with a custom stable entry template', () => {
    const signup = read('src/app/[locale]/signup/page.tsx');

    expect(signup).toContain('function getOnboardingHref(locale: string, planId?: string)');
    expect(signup).toContain('const fallbackHref = getOnboardingHref(locale, planId);');
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain('isAllowedLocalizedContinuation');
    expect(signup).toContain('`/${locale}/onboarding`');
    expect(signup).toContain('`/${locale}/checkout`');
    expect(signup).toContain('function getSignInHref(locale: string, planId?: string, nextPath?: string)');
    expect(signup).toContain('const signInUrl = getSignInHref(activeLocale, selectedPlan?.id, continuationHref);');
    expect(signup).toContain('useSignUp');
    expect(signup).toContain('authenticateWithRedirect');
    expect(signup).toContain('signUp.create({ emailAddress: email, password });');
    expect(signup).toContain("prepareEmailAddressVerification({ strategy: 'email_code' })");
    expect(signup).toContain('attemptEmailAddressVerification({ code })');
    expect(signup).toContain('!selectedPlan');
    expect(signup).toContain('getSignupPlanHref');
    expect(signup).not.toContain('<SignUp');
    expect(signup).not.toContain(signupNextPattern);
    expect(signup).not.toContain(loginNextPattern);
  });

  it('keeps OAuth callback route available for Google redirects', () => {
    if (existsSync('src/app/[locale]/oauth/complete/page.tsx')) {
      const callback = read('src/app/[locale]/oauth/complete/page.tsx');
      const middleware = read('src/middleware.ts');

      expect(callback).toContain('AuthenticateWithRedirectCallback');
      expect(middleware).toContain("'/oauth/complete'");
      return;
    }

    const callback = read('src/app/[locale]/auth/callback/route.ts');
    expect(callback).toContain("export { GET } from '@/app/auth/callback/route'");
  });

  it('keeps onboarding as the activation decision point', () => {
    const onboarding = read('src/app/[locale]/onboarding/page.tsx');

    expect(onboarding).toContain('getCurrentUser');
    expect(onboarding).toContain('getOnboardingActivationState');
    expect(onboarding).toContain('B2BOnboardingFlow');
    expect(onboarding).toContain('saveOnboardingDraft');
    expect(onboarding).toContain('completeOnboardingActivation');
    expect(onboarding).toContain('redirect(`/${safeLocale}/dashboard/organizations${planQuery}`)');
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
});
