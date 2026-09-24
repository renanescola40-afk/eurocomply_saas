import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260924142500_tenant_wide_mfa_terminal.sql', 'utf8');
const activeAuthorityMigration = readFileSync('supabase/migrations/20260924143500_tenant_mfa_app_private_rls_authority.sql', 'utf8');
const guard = readFileSync('src/server/security/tenant-mfa.ts', 'utf8');
const apiGuards = readFileSync('src/server/security/api-guards.ts', 'utf8');
const rbac = readFileSync('src/server/security/rbac.ts', 'utf8');
const commercialAccess = readFileSync('src/server/security/commercial-access.ts', 'utf8');
const dashboardLayout = readFileSync('src/app/[locale]/dashboard/layout.tsx', 'utf8');
const billingEntitlements = readFileSync('src/app/api/billing/entitlements/route.ts', 'utf8');
const routePolicy = readFileSync('src/lib/security/commercial-route-policy.ts', 'utf8');
const settingsRoute = readFileSync('src/app/api/security/settings/route.ts', 'utf8');
const mfaPage = readFileSync('src/app/[locale]/mfa/page.tsx', 'utf8');
const enrollment = readFileSync('src/components/security/tenant-mfa-enrollment.tsx', 'utf8');

describe('tenant-wide mandatory MFA contract', () => {
  it('stores a tenant-scoped default-off policy and enforces AAL2 at the RLS authority', () => {
    expect(migration).toContain('require_mfa_for_all_users boolean not null default false');
    expect(migration).toContain("auth.jwt() ->> 'aal'");
    expect(migration).toContain("= 'aal2'");
    expect(migration).toContain('public.tenant_mfa_satisfied(target_organization_id)');
    expect(migration).toContain('create or replace function public.is_org_member');
    expect(migration).toContain('create or replace function public.has_org_role');
    expect(activeAuthorityMigration).toContain('create or replace function app_private.is_org_member');
    expect(activeAuthorityMigration).toContain('create or replace function app_private.has_org_role');
    expect(activeAuthorityMigration).toContain('public.tenant_mfa_satisfied(target_organization_id)');
  });

  it('fails closed on page, API and RBAC access when an enabled tenant lacks AAL2', () => {
    expect(guard).toContain("TenantMfaError('tenant_mfa_required', 403)");
    expect(guard).toContain("TenantMfaError('tenant_mfa_check_failed', 503)");
    expect(apiGuards).toContain('requireTenantMfaForOrganization(organizationId)');
    expect(rbac).toContain('requireTenantMfaForOrganization(organizationId)');
    expect(commercialAccess).toContain('getTenantMfaSessionState(access.organization.id)');
    expect(commercialAccess).toContain('/mfa?next=');
    expect(commercialAccess).toContain('requireAuthenticatedOrganizationMfaPageAccess');
    expect(dashboardLayout).toContain('requireAuthenticatedOrganizationMfaPageAccess({ locale, pathname })');
    expect(billingEntitlements).toContain('requireOrganizationAccess');
  });

  it('keeps the MFA enrollment route authenticated but outside the licensed-product recursion', () => {
    expect(routePolicy).toContain("'/mfa'");
    expect(mfaPage).toContain('getCurrentUser()');
    expect(mfaPage).toContain('getCurrentOrganizationForUser(user.id)');
    expect(mfaPage).toContain("value.includes('\\\\')");
    expect(mfaPage).toContain("value.startsWith(`/${locale}/`)");
    expect(enrollment).toContain('supabase.auth.mfa.listFactors');
    expect(enrollment).toContain('supabase.auth.mfa.unenroll');
    expect(enrollment).toContain('supabase.auth.mfa.enroll');
    expect(enrollment).toContain('supabase.auth.mfa.challenge');
    expect(enrollment).toContain('supabase.auth.mfa.verify');
    expect(enrollment).toContain('getAuthenticatorAssuranceLevel');
    expect(enrollment).toContain("currentLevel !== 'aal2'");
  });

  it('restricts policy changes to the existing privileged settings boundary and audits the setting', () => {
    expect(settingsRoute).toContain("permission: 'manage_settings'");
    expect(settingsRoute).toContain("minimumPlan: 'starter'");
    expect(settingsRoute).toContain("action: 'change_security_settings'");
    expect(settingsRoute).toContain('requireMfaForAllUsers');
    expect(settingsRoute).toContain('require_mfa_for_all_users');
    expect(settingsRoute).toContain('requireStepUpForRequest');
    expect(settingsRoute).toContain('createAuditEvent');
  });
});
