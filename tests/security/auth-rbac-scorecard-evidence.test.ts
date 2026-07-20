import { describe, expect, it } from 'vitest';

import { buildAuthRbacScorecardEvidence } from '../../scripts/security/write-auth-rbac-scorecard-evidence.mjs';

const SHA = 'a'.repeat(40);

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
    },
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
    },
    ...overrides,
  };
}

function check(document: ReturnType<typeof buildAuthRbacScorecardEvidence>, name: string) {
  return document.checks.find((item) => item.name === name);
}

describe('canonical Auth/RBAC scorecard evidence', () => {
  it('promotes signup and RBAC only from trusted runtime and cleanup evidence', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource(), {
      generatedAt: '2026-07-20T01:00:00.000Z',
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('partial');
    expect(evidence.controlsVerified).toEqual(['signup', 'login', 'logout', 'sessionRefresh', 'rbac']);
    expect(evidence.remainingControls).toEqual(['oauthCallback', 'organizationOnboarding']);
    for (const name of evidence.controlsVerified) expect(check(evidence, name)).toEqual({ name, passed: true });
    for (const name of evidence.remainingControls) {
      expect(check(evidence, name)).toMatchObject({ name, status: 'NOT_VERIFIED' });
    }
    expect(evidence.productionGate).toBe('blocked');
    expect(evidence.evidenceIntegrity.exactShaBound).toBe(true);
  });

  it('fails closed when exact-SHA provenance is not trusted', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource({ checkedOutSha: 'b'.repeat(40) }));
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.controlsVerified).toEqual([]);
    expect(evidence.sourceEvidence.trusted).toBe(false);
  });

  it('does not promote signup when cleanup is missing', () => {
    const source = trustedSource({
      checks: { ...trustedSource().checks, disposableSignupCleanup: false },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);
    expect(evidence.controlsVerified).toEqual([]);
    expect(check(evidence, 'signup')).toMatchObject({ name: 'signup', status: 'NOT_VERIFIED' });
  });

  it('does not promote RBAC when a mutation-denial assertion is missing', () => {
    const source = trustedSource({
      checks: { ...trustedSource().checks, crossTenantOrganizationDeleteDenied: false },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);
    expect(evidence.controlsVerified).toEqual([]);
    expect(check(evidence, 'rbac')).toMatchObject({ name: 'rbac', status: 'NOT_VERIFIED' });
  });

  it('keeps OAuth and onboarding unverified without dedicated runtime journeys', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource());
    expect(check(evidence, 'oauthCallback')).toMatchObject({ status: 'NOT_VERIFIED' });
    expect(check(evidence, 'organizationOnboarding')).toMatchObject({ status: 'NOT_VERIFIED' });
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
  });
});
