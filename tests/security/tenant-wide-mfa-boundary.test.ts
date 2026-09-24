import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tenant-wide mandatory MFA boundary', () => {
  it('keeps policy authority, AAL2 enforcement, API blocking and enrollment flow wired together', () => {
    const migration = readFileSync('supabase/migrations/20260924142243_tenant_wide_mfa.sql', 'utf8');
    const helper = readFileSync('src/server/security/tenant-mfa.ts', 'utf8');
    const apiGuards = readFileSync('src/server/security/api-guards.ts', 'utf8');
    const commercialAccess = readFileSync('src/server/security/commercial-access.ts', 'utf8');
    const settingsRoute = readFileSync('src/app/api/security/settings/route.ts', 'utf8');
    const enrollment = readFileSync('src/components/security/tenant-mfa-enrollment.tsx', 'utf8');
    const page = readFileSync('src/app/[locale]/security/mfa/page.tsx', 'utf8');

    expect(migration).toContain('require_mfa_for_all_users boolean not null default false');
    expect(migration).toContain('retain RLS and FORCE RLS');
    expect(migration).toContain("not has_table_privilege('service_role'");

    expect(helper).toContain("select('require_mfa_for_all_users')");
    expect(helper).toContain('getAuthenticatorAssuranceLevel');
    expect(helper).toContain("currentLevel === 'aal2'");
    expect(helper).toContain('expectedUserId');

    expect(apiGuards).toContain("code: 'mfa_required'");
    expect(apiGuards).toContain('requireTenantMfaForApi(options.userId, organizationId)');
    expect(commercialAccess).toContain('/security/mfa?next=');

    expect(settingsRoute).toContain('requireMfaForAllUsers');
    expect(settingsRoute).toContain('require_mfa_for_all_users: requireMfaForAllUsers');

    expect(enrollment).toContain('supabase.auth.mfa.enroll');
    expect(enrollment).toContain('supabase.auth.mfa.listFactors');
    expect(enrollment).toContain('supabase.auth.mfa.challengeAndVerify');
    expect(enrollment).toContain("currentLevel !== 'aal2'");
    expect(page).toContain('safeNextPath');
  });
});
