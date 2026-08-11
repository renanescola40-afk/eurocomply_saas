import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../scripts/security/run-auth-rbac-live-validation.mjs';
import { evaluateIdentityJourneyChecks } from '../../scripts/security/lib/ephemeral-auth-journeys.mjs';

const SHA = 'a'.repeat(40);
const passingChecks = {
  fixtureConfigurationPresent: true,
  ephemeralFixturesCreated: true,
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
  ephemeralFixturesCleanup: true,
};

const passingJourneyChecks = {
  disposableSignup: true,
  signupSessionRevoked: true,
  disposableSignupCleanup: true,
  onboardingUserInitiallyUnscoped: true,
  onboardingOrganizationCreated: true,
  onboardingActivationCompleted: true,
  onboardingStateObserved: true,
  onboardingCleanup: true,
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
  it('completes core proof only when every authorization, cleanup and provenance check passes', () => {
    expect(evaluate({ checks: passingChecks, provenance })).toEqual({
      complete: true,
      allChecksPassed: true,
      trusted: true,
    });
  });

  it('fails core proof closed for fixture lifecycle, tenant mutation, refresh, stale SHA or local execution', () => {
    for (const failedCheck of [
      'ephemeralFixturesCreated',
      'ephemeralFixturesCleanup',
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

  it('evaluates signup and onboarding as a separate cleanup-bound identity journey', () => {
    expect(evaluateIdentityJourneyChecks(passingJourneyChecks)).toEqual({
      signupPassed: true,
      onboardingPassed: true,
      complete: true,
    });
    expect(evaluateIdentityJourneyChecks({
      ...passingJourneyChecks,
      disposableSignupCleanup: false,
    })).toEqual({
      signupPassed: false,
      onboardingPassed: true,
      complete: false,
    });
    expect(evaluateIdentityJourneyChecks({
      ...passingJourneyChecks,
      onboardingCleanup: false,
    })).toEqual({
      signupPassed: true,
      onboardingPassed: false,
      complete: false,
    });
  });

  it('creates and verifies disposable fixtures without persistent fixture secrets', () => {
    const script = readFileSync('scripts/security/run-auth-rbac-live-validation.mjs', 'utf8');
    const fixtures = readFileSync('scripts/security/lib/ephemeral-auth-fixtures.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/auth-rbac-runtime-proof.yml', 'utf8');

    for (const token of [
      'createEphemeralAuthFixtures',
      'cleanupEphemeralAuthFixtures',
      'ephemeralFixturesCreated',
      'ephemeralFixturesCleanup',
      "from('organizations')",
      "from('organization_members')",
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

    for (const token of [
      'auth.admin.createUser',
      "from('organizations')",
      "from('organization_members')",
      'auth.admin.deleteUser',
      'auth.admin.getUserById',
      'organization_cleanup_not_verified',
      'user_cleanup_not_verified',
    ]) expect(fixtures).toContain(token);

    for (const removedSecret of [
      'AUTH_RBAC_OWNER_EMAIL',
      'AUTH_RBAC_OWNER_PASSWORD',
      'AUTH_RBAC_MEMBER_EMAIL',
      'AUTH_RBAC_MEMBER_PASSWORD',
      'AUTH_RBAC_OUTSIDER_EMAIL',
      'AUTH_RBAC_OUTSIDER_PASSWORD',
      'AUTH_RBAC_ORGANIZATION_A_ID',
      'AUTH_RBAC_ORGANIZATION_B_ID',
      'AUTH_RBAC_DISPOSABLE_EMAIL_DOMAIN',
    ]) expect(workflow).not.toContain(removedSecret);

    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('runs real public signup and atomic onboarding with verified same-run cleanup', () => {
    const script = readFileSync('scripts/security/run-auth-rbac-live-validation.mjs', 'utf8');
    const journey = readFileSync('scripts/security/lib/ephemeral-auth-journeys.mjs', 'utf8');

    expect(script).toContain('runEphemeralSignupOnboardingJourney');
    expect(script).toContain('identityJourney');
    expect(script).toContain('identityJourneyCleanupVerified');

    for (const token of [
      'anon.auth.signUp',
      "rpc('create_organization_with_owner_atomic'",
      "rpc('complete_onboarding_activation_atomic'",
      'onboarding_status',
      "from('onboarding_activation_runs')",
      "from('ai_systems')",
      "from('organization_members')",
      "from('organizations')",
      'auth.admin.deleteUser',
      'signup_user_cleanup_not_verified',
      'onboarding_cleanup_not_verified',
      'containsSensitiveValues: false',
      'rawCredentialsStored: false',
      'accessTokensStored: false',
      'userIdentifiersStored: false',
      'organizationIdentifiersStored: false',
      'rawProviderResponsesStored: false',
      'cleanupRequired: true',
    ]) expect(journey).toContain(token);

    expect(journey).not.toContain('writeFileSync');
    expect(journey).not.toContain('console.log(credentials');
  });
});
