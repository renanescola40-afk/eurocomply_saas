import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 5 dashboard invariants', () => {
  it('keeps root and localized marketing entrypoints stable', () => {
    expect(read('src/app/page.tsx')).toContain("'/pt'");
    const home = read('src/app/[locale]/page.tsx');
    expect(home).toContain('force-static');
    expect(home).toContain('revalidate = 300');
    expect(home).toContain('EnterpriseHome');
  });

  it('keeps marketing/auth middleware routed through onboarding', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain("const ORGANIZATION_DASHBOARD_PATH = '/dashboard/organizations'");
    expect(middleware).toContain("const AUTH_SUCCESS_PATH = '/onboarding'");
    expect(middleware).toContain('shouldCheckMarketingHomeAuth');
    expect(middleware).toContain('hasSupabaseSession');
    expect(middleware).toContain('withPrivateNoStore');
  });

  it('keeps locale layout and auth pages on the shared Supabase auth shell', () => {
    const layout = read('src/app/[locale]/layout.tsx');
    const auth = read('src/hooks/useAuth.tsx');
    const login = read('src/app/[locale]/login/page.tsx');
    const signup = read('src/app/[locale]/signup/page.tsx');

    expect(layout).toContain('AuthProvider');
    expect(layout).toContain('AuthFloatingControls');
    expect(auth).toContain("import { supabase } from '@/integrations/supabase/client'");
    expect(auth).not.toContain('@ts-nocheck');
    expect(login).toContain('successHref');
    expect(login).toContain('signUpHref');
    expect(login).toContain('safeNext');
    expect(login).toContain('signInWithEmail');
    expect(login).toContain('signInWithGoogle');
    expect(signup).toContain('getOnboardingHref');
    expect(signup).toContain('isAllowedLocalizedContinuation');
    expect(signup).toContain('getSignInHref');
    expect(signup).toContain('getSignupPlanHref');
    expect(signup).toContain('signUpWithEmail');
    expect(signup).toContain('signInWithGoogle');
  });

  it('keeps OAuth callback exchanging Supabase codes safely', () => {
    const callback = read('src/app/auth/callback/route.ts');
    expect(callback).toContain('createServerSupabaseClient');
    expect(callback).toContain('exchangeCodeForSession');
    expect(callback).toContain('missing_oauth_code');
    expect(callback).toContain('auth_exchange_failed');
  });

  it('keeps dashboard/organizations protected by the shared onboarding gate', () => {
    const layout = read('src/app/[locale]/dashboard/organizations/layout.tsx');
    const access = read('src/server/queries/organization-dashboard-access.ts');
    const dashboard = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const currentOrganization = read('src/server/queries/current-organization.ts');

    expect(layout).toContain('getOrganizationDashboardRedirect(safeLocale)');
    expect(access).toContain('getCurrentUser');
    expect(access).toContain('getCurrentOrganizationForUser(user.id)');
    expect(access).toContain('!currentOrganization || !currentOrganization.is_onboarding_completed');
    expect(access).toContain('`/${locale}/onboarding`');
    expect(dashboard).toContain('getLoginPath(safeLocale, dashboardPath)');
    expect(dashboard).toContain('getOrganizationDashboardData');
    expect(currentOrganization).toContain("from('organization_members')");
    expect(currentOrganization).toContain('onboarding_completed_at');
    expect(currentOrganization).toContain('isOrganizationOnboardingCompleted');
    expect(currentOrganization).toContain('membership.slug === slug');
  });

  it('keeps workflow readiness wired through dashboard actions', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const overview = read('src/components/dashboard/dashboard-home-overview.tsx');
    const actions = read('src/components/dashboard/next-best-actions.tsx');
    const query = read('src/server/queries/organization-dashboard.ts');

    expect(page).toContain('workflowReadiness={data.workflowReadiness}');
    expect(overview).toContain('workflowReadiness={workflowReadiness}');
    expect(actions).toContain('buildWorkflowReadinessAction');
    expect(actions).toContain('current workflow readiness');
    expect(query).toContain("eq('organization_id', organizationId)");
    expect(query).toContain("from('compliance_tasks')");
    expect(query).toContain("from('risks')");
    expect(query).toContain("from('vendors')");
    expect(query).toContain("from('documents')");
  });
});
