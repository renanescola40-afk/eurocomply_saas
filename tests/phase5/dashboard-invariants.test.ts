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
    expect(middleware).toContain('getSupabaseUserId');
  });

  it('keeps locale layout on Supabase auth provider without Clerk wrappers', () => {
    const layout = read('src/app/[locale]/layout.tsx');
    const auth = read('src/hooks/useAuth.tsx');

    expect(layout).toContain('AuthProvider');
    expect(layout).toContain('AuthFloatingControls');
    expect(layout).not.toContain('ClerkProvider');
    expect(layout).not.toContain('DisabledAuthProvider');
    expect(auth).toContain("import { supabase } from '@/integrations/supabase/client'");
    expect(auth).not.toContain('@ts-nocheck');
    expect(auth).not.toContain('@clerk/nextjs');
  });

  it('keeps login success fallback on onboarding while using Supabase auth', () => {
    const login = read('src/app/[locale]/login/page.tsx');

    expect(login).toContain('function successHref(locale: string, planId?: string | null)');
    expect(login).toContain('const fallback = successHref(locale, planId);');
    expect(login).toContain('value.length > 240');
    expect(login).toContain("value.includes('://')");
    expect(login).toContain("value.startsWith('//')");
    expect(login).toContain('signInWithEmail');
    expect(login).toContain('signInWithGoogle');
    expect(login).toContain('router.replace(afterSignInUrl)');
    expect(login).toContain('`/${locale}/onboarding`');
    expect(login).toContain('`/${locale}/dashboard/organizations`');
    expect(login).toContain('`/${locale}/checkout`');
    expect(login).not.toContain('@clerk/nextjs');
    expect(login).not.toContain('useSignIn');
    expect(login).not.toContain('authenticateWithRedirect');
    expect(login).not.toContain('signIn.create({ identifier: email, password });');
    expect(login).not.toContain('<SignIn');
  });

  it('keeps signup continuation defaulted to onboarding with Supabase auth', () => {
    const signup = read('src/app/[locale]/signup/page.tsx');
    expect(signup).toContain('function getOnboardingHref(locale: string, planId?: string)');
    expect(signup).toContain("normalizedNext.startsWith('//')");
    expect(signup).toContain("normalizedNext.includes('://')");
    expect(signup).toContain('isAllowedLocalizedContinuation');
    expect(signup).toContain('`/${locale}/onboarding`');
    expect(signup).toContain('`/${locale}/checkout`');
    expect(signup).toContain('function getSignInHref(locale: string, planId?: string, nextPath?: string)');
    expect(signup).toContain('signUpWithEmail');
    expect(signup).toContain('signInWithGoogle');
    expect(signup).toContain('getSignupPlanHref');
    expect(signup).not.toContain('@clerk/nextjs');
    expect(signup).not.toContain('useSignUp');
    expect(signup).not.toContain('authenticateWithRedirect');
    expect(signup).not.toContain('signUp.create({ emailAddress: email, password });');
    expect(signup).not.toContain('<SignUp');
    expect(signup).not.toContain(signupNextPattern);
    expect(signup).not.toContain(loginNextPattern);
  });

  it('keeps OAuth callback route exchanging Supabase codes safely', () => {
    if (existsSync('src/app/[locale]/oauth/complete/page.tsx')) {
      const callback = read('src/app/[locale]/oauth/complete/page.tsx');
      const middleware = read('src/middleware.ts');

      expect(callback).toContain('AuthenticateWithRedirectCallback');
      expect(middleware).toContain("'/oauth/complete'");
      return;
    }

    const callback = read('src/app/auth/callback/route.ts');
    expect(callback).toContain('createServerSupabaseClient');
    expect(callback).toContain('exchangeCodeForSession');
    expect(callback).toContain('missing_oauth_code');
    expect(callback).toContain('auth_exchange_failed');
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
