import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('public launch auth and billing access flow', () => {
  it('starts Google OAuth from the login page instead of showing the expired prelaunch notice', () => {
    const login = readRepoFile('src/app/[locale]/login/page.tsx');

    expect(login).toContain('signInWithGoogle');
    expect(login).toContain('signInWithGoogle({ next: afterSignInUrl })');
    expect(login).not.toContain('PRELAUNCH_OWNER_EMAIL');
    expect(login).not.toContain('setNoticeOpen(true)');
  });

  it('keeps tenant-context onboarding reads privileged and fail closed while preserving the selected plan', () => {
    const currentOrganization = readRepoFile('src/server/queries/current-organization.ts');
    const onboardingState = readRepoFile('src/server/queries/onboarding.ts');

    expect(currentOrganization).toContain("import { createAdminClient } from '@/lib/supabase/admin'");
    expect(currentOrganization).toContain('const supabase = createAdminClient();');
    expect(currentOrganization).not.toContain('tryCreateAdminClient');
    expect(currentOrganization).toContain('selected_plan');
    expect(onboardingState).toContain("import { createAdminClient } from '@/lib/supabase/admin'");
    expect(onboardingState).toContain('const supabase = createAdminClient();');
    expect(onboardingState).not.toContain('tryCreateAdminClient');
    expect(onboardingState).toContain('selectedPlan: membership.selected_plan');
  });

  it('requires an active or trialing subscription before organization dashboard access', () => {
    const dashboardAccess = readRepoFile('src/server/queries/organization-dashboard-access.ts');

    expect(dashboardAccess).toContain('getOrganizationBillingContext');
    expect(dashboardAccess).toContain("new Set(['active', 'trialing'])");
    expect(dashboardAccess).toContain('checkout=required');
    expect(dashboardAccess).toContain('currentOrganization.selected_plan');
  });

  it('allows the first Stripe checkout without forcing a brand-new Google user to enroll MFA first', () => {
    const checkoutRoute = readRepoFile('src/app/api/billing/checkout/route.ts');

    expect(checkoutRoute).toContain('const isInitialCheckout = !hasExistingBillingRelationship(billingBinding)');
    expect(checkoutRoute).toContain("billing_flow: isInitialCheckout ? 'initial_subscription' : 'existing_billing_change'");
    expect(checkoutRoute).toContain('requireStepUpForRequest');
    expect(checkoutRoute).toContain('stepUpRequired: !isInitialCheckout');
    expect(checkoutRoute).toContain('requireTrustedMutation');
    expect(checkoutRoute).toContain("permission: 'manage_billing'");
    expect(checkoutRoute).toContain('writeAuditLog');
  });
});
