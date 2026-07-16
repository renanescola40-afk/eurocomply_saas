import { describe, expect, it } from 'vitest';

import { buildAuthRbacScorecardEvidence } from '../../scripts/security/write-auth-rbac-scorecard-evidence.mjs';

const SHA = 'a'.repeat(40);

function trustedSource(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'risck-comply.auth-rbac-runtime-evidence.v1',
    evidenceItem: 'auth-rbac-final-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-16T00:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    targetSha: SHA,
    checkedOutSha: SHA,
    checks: {
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
      runtimeProofInvented: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
    },
    ...overrides,
  };
}

function check(document: ReturnType<typeof buildAuthRbacScorecardEvidence>, name: string) {
  return document.checks.find((item) => item.name === name);
}

describe('canonical Auth/RBAC scorecard evidence', () => {
  it('promotes only the controls explicitly proven by the trusted runtime source', () => {
    const evidence = buildAuthRbacScorecardEvidence(trustedSource(), {
      generatedAt: '2026-07-16T01:00:00.000Z',
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('partial');
    expect(evidence.controlsVerified).toEqual(['login', 'logout', 'sessionRefresh', 'rbac']);
    expect(evidence.remainingControls).toEqual([
      'signup',
      'oauthCallback',
      'organizationOnboarding',
    ]);
    expect(check(evidence, 'login')).toEqual({ name: 'login', passed: true });
    expect(check(evidence, 'logout')).toEqual({ name: 'logout', passed: true });
    expect(check(evidence, 'sessionRefresh')).toEqual({ name: 'sessionRefresh', passed: true });
    expect(check(evidence, 'rbac')).toEqual({ name: 'rbac', passed: true });

    for (const name of evidence.remainingControls) {
      expect(check(evidence, name)).toMatchObject({
        name,
        status: 'NOT_VERIFIED',
      });
    }

    expect(evidence.productionGate).toBe('blocked');
    expect(evidence.evidenceIntegrity.exactShaBound).toBe(true);
  });

  it('fails closed when exact-SHA provenance is not trusted', () => {
    const source = trustedSource({ checkedOutSha: 'b'.repeat(40) });
    const evidence = buildAuthRbacScorecardEvidence(source);

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.controlsVerified).toEqual([]);
    expect(evidence.remainingControls).toHaveLength(7);
    expect(evidence.sourceEvidence.trusted).toBe(false);
    expect(evidence.evidenceIntegrity.exactShaBound).toBe(false);
    expect(evidence.checks.every((item) => item.status === 'NOT_VERIFIED')).toBe(true);
  });

  it('does not promote RBAC when any tenant denial assertion is missing', () => {
    const source = trustedSource({
      checks: {
        ...trustedSource().checks,
        outsiderCannotReadTenantA: false,
      },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);

    expect(check(evidence, 'login')).toEqual({ name: 'login', passed: true });
    expect(check(evidence, 'logout')).toEqual({ name: 'logout', passed: true });
    expect(check(evidence, 'sessionRefresh')).toEqual({ name: 'sessionRefresh', passed: true });
    expect(check(evidence, 'rbac')).toMatchObject({
      name: 'rbac',
      status: 'NOT_VERIFIED',
    });
    expect(evidence.controlsVerified).toEqual(['login', 'logout', 'sessionRefresh']);
  });

  it('does not promote session refresh when the source check fails', () => {
    const source = trustedSource({
      checks: {
        ...trustedSource().checks,
        sessionRefresh: false,
      },
    });
    const evidence = buildAuthRbacScorecardEvidence(source);

    expect(check(evidence, 'sessionRefresh')).toMatchObject({
      name: 'sessionRefresh',
      status: 'NOT_VERIFIED',
    });
    expect(evidence.controlsVerified).toEqual([]);
    expect(evidence.sourceEvidence.trusted).toBe(false);
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
    expect(JSON.stringify(evidence)).not.toContain('password');
    expect(JSON.stringify(evidence)).not.toContain('access_token');
  });
});
