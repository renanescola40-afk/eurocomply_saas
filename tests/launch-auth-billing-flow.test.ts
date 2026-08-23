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

  it('requires canonical licensed billing authority before organization dashboard access', () => {
    const dashboardAccess = readRepoFile('src/server/queries/organization-dashboard-access.ts');
    const billingContext = readRepoFile('src/server/queries/billing.ts');

    expect(dashboardAccess).toContain('getOrganizationBillingAuthority(currentOrganization.id)');
    expect(dashboardAccess).toContain('if (!authority.licensed)');
    expect(dashboardAccess).not.toContain('getOrganizationBillingContext');
    expect(dashboardAccess).not.toContain("new Set(['active', 'trialing'])");
    expect(dashboardAccess).toContain('checkout=required');
    expect(dashboardAccess).toContain('currentOrganization.selected_plan');
    expect(billingContext).toContain('getAuthoritativeSignedContractPlan');
    expect(billingContext).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(billingContext).toContain('status = signedContractPlan');
  });

  it('allows first live Stripe checkout without forcing a new Google user to enroll MFA first', () => {
    const checkoutRoute = readRepoFile('src/app/api/billing/checkout/route.ts');
    const activationRoute = readRepoFile('src/app/api/billing/checkout/activation/route.ts');

    expect(checkoutRoute).toContain('const hasLiveSubscription = await hasLiveSubscriptionRelationship');
    expect(checkoutRoute).toContain("billing_flow: 'initial_subscription'");
    expect(checkoutRoute).toContain('requireStepUpForRequest');
    expect(checkoutRoute).toContain('pendingCustomerBindingPersisted: true');
    expect(checkoutRoute).toContain('requireTrustedMutation');
    expect(checkoutRoute).toContain("permission: 'manage_billing'");
    expect(checkoutRoute).toContain('writeAuditLog');
    expect(checkoutRoute).toContain('/checkout/complete');
    expect(checkoutRoute).not.toContain('/dashboard/organizations?checkout=success');

    expect(activationRoute).toContain('getCurrentOrganizationForUser(user.id)');
    expect(activationRoute).toContain("new Set(['active'])");
    expect(activationRoute).not.toContain("new Set(['active', 'trialing'])");
    expect(activationRoute).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(activationRoute).toContain('stripe_customer_id');
    expect(activationRoute).toContain('stripe_subscription_id');
    expect(activationRoute).toContain("authority: 'processed_live_stripe_subscription_event'");
    expect(activationRoute).not.toContain('session_id');
  });
});