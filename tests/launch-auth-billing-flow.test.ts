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

  it('falls back to the authenticated Supabase client and legacy membership columns during rollout', () => {
    const currentOrganization = readRepoFile('src/server/queries/current-organization.ts');

    expect(currentOrganization).toContain('tryCreateAdminClient');
    expect(currentOrganization).toContain('createServerSupabaseClient');
    expect(currentOrganization).toContain('isExpectedSchemaFallback(error)');
    expect(currentOrganization).toContain("organizations(id, name, slug)");
    expect(currentOrganization).toContain('selected_plan');
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
