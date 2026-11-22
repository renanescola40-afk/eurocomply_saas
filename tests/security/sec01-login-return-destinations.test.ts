import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowedLoginReturnDestination } from '@/lib/auth/login-return-destinations';

describe('SEC-01 post-login profile return allowlist', () => {
  it.each(['en', 'pt', 'es', 'fr', 'it', 'de'])(
    'retains the private /%s/profile return requested by the server',
    (locale) => {
      expect(isAllowedLoginReturnDestination(`/${locale}/profile`, locale)).toBe(true);
      expect(isAllowedLoginReturnDestination(`/${locale}/profile?tab=privacy`, locale)).toBe(true);
    },
  );

  it.each(['en', 'pt', 'es', 'fr', 'it', 'de'])(
    'preserves the authenticated /%s/mfa self-setup return across login',
    (locale) => {
      expect(isAllowedLoginReturnDestination(`/${locale}/mfa`, locale)).toBe(true);
      expect(isAllowedLoginReturnDestination(`/${locale}/mfa?setup=1`, locale)).toBe(true);
      expect(isAllowedLoginReturnDestination(`/${locale}/mfa-other`, locale)).toBe(false);
    },
  );

  it('keeps explicit MFA enrollment identity-only before any privileged organization lookup', () => {
    const page = readFileSync('src/app/[locale]/mfa/page.tsx', 'utf8');
    const authCheck = page.indexOf('const user = await getCurrentUser()');
    const setupBoundary = page.indexOf('if (!setupRequested) {');
    const tenantLookup = page.indexOf('const organization = await getCurrentOrganizationForUser(user.id);');
    const tenantPolicy = page.indexOf('const state = await getTenantMfaSessionState(organization.id);');

    expect(authCheck).toBeGreaterThan(-1);
    expect(setupBoundary).toBeGreaterThan(authCheck);
    expect(tenantLookup).toBeGreaterThan(setupBoundary);
    expect(tenantPolicy).toBeGreaterThan(tenantLookup);
    expect(page).toContain("setupRequested ? '?setup=1' : ''");
    expect(page).toContain('redirect(`/${safeLocale}/login?next=${encodeURIComponent(mfaPath)}`)');
    expect(page).toContain("const setupRequested = query.setup === '1'");
    expect(page).toContain('safeNextPath(query.next, safeLocale)');
    expect(page).not.toContain('createAdminClient');
  });

  it('keeps the unprivileged QA MFA route as account-only enrollment, never tenant authorization', () => {
    const page = readFileSync('src/app/[locale]/mfa/page.tsx', 'utf8');
    const component = readFileSync('src/components/security/tenant-mfa-enrollment.tsx', 'utf8');
    const authentication = page.indexOf('const user = await getCurrentUser()');
    const adminKeyCheck = page.indexOf('const hasPrivilegedTenantPolicyReader = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())');
    const privilegedBranch = page.indexOf('if (hasPrivilegedTenantPolicyReader) {');
    const tenantLookup = page.indexOf('const organization = await getCurrentOrganizationForUser(user.id);');

    expect(authentication).toBeGreaterThan(-1);
    expect(adminKeyCheck).toBeGreaterThan(authentication);
    expect(privilegedBranch).toBeGreaterThan(adminKeyCheck);
    expect(tenantLookup).toBeGreaterThan(privilegedBranch);
    expect(page).toContain('accountSetupOnly={setupRequested || !hasPrivilegedTenantPolicyReader}');
    expect(page).toContain('const state = await getTenantMfaSessionState(organization.id);');
    expect(component).toContain('accountSetupOnly = false');
    expect(component).toContain("accountSetupOnly ? 'Set up multi-factor authentication'");
    expect(component).toContain('Workspace access is controlled separately by organization policy and session assurance.');
    expect(component).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(component).not.toContain('createAdminClient');
  });

  it('preserves the existing onboarding, dashboard and checkout destinations', () => {
    for (const path of [
      '/en/onboarding',
      '/en/dashboard/organizations',
      '/en/dashboard/observability',
      '/en/checkout?plan=business',
    ]) expect(isAllowedLoginReturnDestination(path, 'en')).toBe(true);
  });

  it.each([
    '//evil.example/path',
    'https://evil.example',
    '/fr/profile',
    '/en/profiles',
    '/en/profile-evil',
    '/en/admin/sales/leads',
    '/en/login',
  ])('does not add a new unsafe/unrelated return target: %s', (path) => {
    expect(isAllowedLoginReturnDestination(path, 'en')).toBe(false);
  });

  it('keeps client login calling the allowlist after existing external-URL guards', () => {
    const page = readFileSync('src/app/[locale]/login/page.tsx', 'utf8');
    expect(page).toContain('function safeNext(');
    expect(page).toContain("value.startsWith('//')");
    expect(page).toContain("value.includes('://')");
    expect(page).toContain('return isAllowedLoginReturnDestination(value, locale) ? value : fallback;');
    expect(page).toContain('router.replace(afterSignInUrl)');
  });
});
