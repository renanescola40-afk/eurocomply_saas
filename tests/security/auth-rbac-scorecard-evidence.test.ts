import { describe, expect, it } from 'vitest';

import { buildAuthRbacScorecardEvidence } from '../../scripts/security/write-auth-rbac-scorecard-evidence.mjs';

const SHA = 'a'.repeat(40);

function completeIdentityJourney() {
  return {
    schema: 'risck-comply.auth-identity-journey.v1',
    status: 'Complete',
    outcome: 'passed',
    checks: {
      disposableSignup: true,
      signupSessionRevoked: true,
      disposableSignupCleanup: true,
      onboardingUserInitiallyUnscoped: true,
      onboardingOrganizationCreated: true,
      onboardingActivationCompleted: true,
      onboardingStateObserved: true,
      onboardingCleanup: true,
    },
    failures: [],
    cleanupVerified: true,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      cleanupRequired: true,
    },
  };
}

function trustedSource(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'risck-comply.auth-rbac-runtime-evidence.v2',
    evidenceItem: 'auth-rbac-final-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-20T00:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    checks: {
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
    },
    identityJourney: completeIdentityJourney(),
    provenance: {
      githubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      runId: '123',
      expectedSha: SHA,
      checkedOutSha: SHA,
      exactShaBound: true,
    },
    failures: [],
    evidenceIntegrity: {
      placeholderOnly: false,
      runtimeProofInvented: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      cleanupVerified: true,
      identityJourneyExplicitlyConfirmed: true,
    },
    ...overrides,
  };
}

function check(document: ReturnType<typeof buildAuthRbacScorecardEvidence>, name: string) {
  return document.checks.find((item) => item.name === name);
}

describe('canonical Auth/RBAC scorecard evidence', () => {
  it('promotes signup and organization onboarding only from trusted confirmed cleaned-up journey evidence', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource(), {
      generatedAt: '2026-07-20T01:00:00.000Z',
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('partial');
    expect(evidence.controlsVerified).toEqual([
      'signup',
      'login',
      'logout',
      'sessionRefresh',
      'rbac',
      'organizationOnboarding',
    ]);
    expect(evidence.remainingControls).toEqual(['oauthCallback']);
    for (const name of evidence.controlsVerified) expect(check(evidence, name)).toEqual({ name, passed: true });
    expect(check(evidence, 'oauthCallback')).toMatchObject({ name: 'oauthCallback', status: 'NOT_VERIFIED' });
    expect(evidence.productionGate).toBe('blocked');
    expect(evidence.sourceEvidence.identityJourneyTrusted).toBe(true);
    expect(evidence.sourceEvidence.identityJourneyExplicitlyConfirmed).toBe(true);
    expect(evidence.evidenceIntegrity.exactShaBound).toBe(true);
  });

  it('fails closed when exact-SHA provenance is not trusted', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource({ checkedOutSha: 'b'.repeat(40) }));
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.controlsVerified).toEqual([]);
    expect(evidence.sourceEvidence.trusted).toBe(false);
    expect(evidence.sourceEvidence.identityJourneyTrusted).toBe(false);
  });

  it('does not promote signup or onboarding without explicit operator confirmation', () => {
    const baseline = trustedSource();
    const source = trustedSource({
      evidenceIntegrity: {
        ...baseline.evidenceIntegrity,
        identityJourneyExplicitlyConfirmed: false,
      },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);

    expect(evidence.controlsVerified).toEqual(['login', 'logout', 'sessionRefresh', 'rbac']);
    expect(check(evidence, 'signup')).toMatchObject({ name: 'signup', status: 'NOT_VERIFIED' });
    expect(check(evidence, 'organizationOnboarding')).toMatchObject({ name: 'organizationOnboarding', status: 'NOT_VERIFIED' });
    expect(evidence.sourceEvidence.identityJourneyTrusted).toBe(false);
    expect(evidence.sourceEvidence.identityJourneyExplicitlyConfirmed).toBe(false);
  });

  it('does not promote signup or onboarding when journey cleanup is missing', () => {
    const journey = completeIdentityJourney();
    journey.cleanupVerified = false;
    journey.checks.disposableSignupCleanup = false;
    journey.checks.onboardingCleanup = false;
    const source = trustedSource({ identityJourney: journey });
    const evidence = buildAuthRbacScorecardEvidence(source);

    expect(evidence.controlsVerified).toEqual(['login', 'logout', 'sessionRefresh', 'rbac']);
    expect(check(evidence, 'signup')).toMatchObject({ name: 'signup', status: 'NOT_VERIFIED' });
    expect(check(evidence, 'organizationOnboarding')).toMatchObject({ name: 'organizationOnboarding', status: 'NOT_VERIFIED' });
    expect(evidence.sourceEvidence.identityJourneyTrusted).toBe(false);
  });

  it('does not promote RBAC when a mutation-denial assertion is missing', () => {
    const baseline = trustedSource();
    const source = trustedSource({
      checks: { ...baseline.checks, crossTenantOrganizationDeleteDenied: false },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);
    expect(evidence.controlsVerified).toEqual([]);
    expect(check(evidence, 'rbac')).toMatchObject({ name: 'rbac', status: 'NOT_VERIFIED' });
  });

  it('keeps signup and onboarding unverified when the dedicated identity journey is absent', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource({ identityJourney: undefined }));
    expect(evidence.controlsVerified).toEqual(['login', 'logout', 'sessionRefresh', 'rbac']);
    expect(check(evidence, 'signup')).toMatchObject({ status: 'NOT_VERIFIED' });
    expect(check(evidence, 'organizationOnboarding')).toMatchObject({ status: 'NOT_VERIFIED' });
  });

  it('keeps OAuth callback unverified even when every disposable Supabase journey passes', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource());
    expect(check(evidence, 'oauthCallback')).toMatchObject({ status: 'NOT_VERIFIED' });
    expect(evidence.remainingControls).toEqual(['oauthCallback']);
    expect(evidence.productionGate).toBe('blocked');
  });

  it('never stores credentials, tokens, identifiers or raw provider responses', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource());
    expect(evidence.evidenceIntegrity).toEqual({
      containsSensitiveValues: false,
      runtimeProofInvented: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      cookiesStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      exactShaBound: true,
    });
    expect(JSON.stringify(evidence)).not.toContain('access_token');
    expect(JSON.stringify(evidence)).not.toContain('password');
  });
});
