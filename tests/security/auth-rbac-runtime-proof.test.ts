import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/security/run-auth-rbac-live-validation.mjs';

const SHA = 'a'.repeat(40);
const passingChecks = {
  fixtureConfigurationPresent: true,
  disposableSignup: true,
  disposableSignupCleanup: true,
  ownerRoleObserved: true,
  memberRoleObserved: true,
  ownerCanReadOwnTenant: true,
  memberCanReadOwnTenant: true,
  outsiderCannotReadTenantA: true,
  ownerCannotReadTenantB: true,
  outsiderCanReadOwnTenant: true,
  crossTenantMembershipHidden: true,
  crossTenantMembershipInsertDenied: true,
  crossTenantMembershipUpdateDenied: true,
  crossTenantMembershipDeleteDenied: true,
  crossTenantOrganizationUpdateDenied: true,
  crossTenantOrganizationDeleteDenied: true,
  sessionRefresh: true,
  sessionsRevoked: true,
};

const provenance = {
  githubActions: true,
  repository: 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  runId: '123456789',
  expectedSha: SHA,
  checkedOutSha: SHA,
};

describe('Auth RBAC protected runtime proof', () => {
  it('completes only when every authorization, cleanup and provenance check passes', () => {
    expect(evaluate({ checks: passingChecks, provenance })).toEqual({
      complete: true,
      allChecksPassed: true,
      trusted: true,
    });
  });

  it('fails closed for signup cleanup, tenant mutation, refresh, stale SHA or local execution', () => {
    for (const failedCheck of [
      'disposableSignupCleanup',
      'outsiderCannotReadTenantA',
      'crossTenantMembershipInsertDenied',
      'crossTenantMembershipUpdateDenied',
      'crossTenantMembershipDeleteDenied',
      'crossTenantOrganizationUpdateDenied',
      'crossTenantOrganizationDeleteDenied',
      'sessionRefresh',
    ]) {
      expect(evaluate({
        checks: { ...passingChecks, [failedCheck]: false },
        provenance,
      }).complete).toBe(false);
    }

    expect(evaluate({
      checks: passingChecks,
      provenance: { ...provenance, checkedOutSha: 'b'.repeat(40) },
    }).complete).toBe(false);

    expect(evaluate({
      checks: passingChecks,
      provenance: { ...provenance, githubActions: false, runId: null },
    }).complete).toBe(false);
  });

  it('uses isolated fixtures, ephemeral credentials and a cleanup-only admin boundary', () => {
    const script = readFileSync('scripts/security/run-auth-rbac-live-validation.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/auth-rbac-runtime-proof.yml', 'utf8');

    for (const token of [
      'AUTH_RBAC_OWNER_EMAIL',
      'AUTH_RBAC_MEMBER_EMAIL',
      'AUTH_RBAC_OUTSIDER_EMAIL',
      'AUTH_RBAC_ORGANIZATION_A_ID',
      'AUTH_RBAC_ORGANIZATION_B_ID',
      'AUTH_RBAC_DISPOSABLE_EMAIL_DOMAIN',
      "from('organizations')",
      "from('organization_members')",
      'auth.signUp',
      'auth.admin.deleteUser',
      'crossTenantMembershipInsertDenied',
      'crossTenantMembershipUpdateDenied',
      'crossTenantMembershipDeleteDenied',
      'crossTenantOrganizationUpdateDenied',
      'crossTenantOrganizationDeleteDenied',
      'supabase.auth.refreshSession',
      'supabase.auth.signOut',
      'serviceRoleKeyStored: false',
      'cleanupRequired: true',
    ]) expect(script).toContain(token);

    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });
});
