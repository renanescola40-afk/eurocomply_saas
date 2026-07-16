import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/security/run-auth-rbac-live-validation.mjs';

const SHA = 'a'.repeat(40);
const passingChecks = {
  fixtureConfigurationPresent: true,
  ownerRoleObserved: true,
  memberRoleObserved: true,
  ownerCanReadOwnTenant: true,
  memberCanReadOwnTenant: true,
  outsiderCannotReadTenantA: true,
  ownerCannotReadTenantB: true,
  outsiderCanReadOwnTenant: true,
  crossTenantMembershipHidden: true,
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
  it('completes only when every authorization and provenance check passes', () => {
    expect(evaluate({ checks: passingChecks, provenance })).toEqual({
      complete: true,
      allChecksPassed: true,
      trusted: true,
    });
  });

  it('fails closed for cross-tenant visibility, refresh failure, stale SHA or local execution', () => {
    expect(evaluate({
      checks: { ...passingChecks, outsiderCannotReadTenantA: false },
      provenance,
    }).complete).toBe(false);

    expect(evaluate({
      checks: { ...passingChecks, sessionRefresh: false },
      provenance,
    }).complete).toBe(false);

    expect(evaluate({
      checks: passingChecks,
      provenance: { ...provenance, checkedOutSha: 'b'.repeat(40) },
    }).complete).toBe(false);

    expect(evaluate({
      checks: passingChecks,
      provenance: { ...provenance, githubActions: false, runId: null },
    }).complete).toBe(false);
  });

  it('uses three synthetic identities, two organizations and no privileged service key', () => {
    const script = readFileSync('scripts/security/run-auth-rbac-live-validation.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/auth-rbac-runtime-proof.yml', 'utf8');

    for (const token of [
      'AUTH_RBAC_OWNER_EMAIL',
      'AUTH_RBAC_MEMBER_EMAIL',
      'AUTH_RBAC_OUTSIDER_EMAIL',
      'AUTH_RBAC_ORGANIZATION_A_ID',
      'AUTH_RBAC_ORGANIZATION_B_ID',
      "from('organizations')",
      "from('organization_members')",
      'outsiderCannotReadTenantA',
      'ownerCannotReadTenantB',
      'crossTenantMembershipHidden',
      'supabase.auth.refreshSession',
      'supabase.auth.signOut',
    ]) expect(script).toContain(token);

    expect(script).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });
});
