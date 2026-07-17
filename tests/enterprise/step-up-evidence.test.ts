import { describe, expect, it } from 'vitest';

import {
  STEP_UP_ROUTE_POLICIES,
  buildStepUpEvidence,
  evaluateExactShaChecks,
  evaluateStepUpCoverage,
} from '../../scripts/enterprise/build-step-up-evidence.mjs';

const SHA = 'a'.repeat(40);

function routeSource(action: string) {
  return `
    const userId = user.id;
    const organizationId = organization.id;
    const stepUp = await requireStepUpForRequest({
      request,
      action: '${action}',
      userId: user.id,
      organizationId: organization.id,
    });
  `;
}

function completeSources() {
  return {
    helper: `
      STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
      STEP_UP_CHALLENGE_MAX_AGE_MS = 2 * 60 * 1000;
      HIGH_RISK_ACTIONS ['export_data'] ['manage_billing'] ['manage_team'] ['gdpr_delete']
      ['audit_chain_verify'] ['audit_chain_export'] ['change_security_settings'];
      createHmac timingSafeEqual randomUUID persistStepUpTokenRecord consumeStepUpToken
      reason: 'step_up_token_replayed' reason: 'step_up_provider_not_configured'
      recordStepUpAuditEvent return noStoreJson(
    `,
    provider: `
      createStepUpProviderChallenge verifyStepUpProviderChallenge supabase.auth.mfa
      getAuthenticatorAssuranceLevel currentLevel !== 'aal2' step_up_challenges
      consumeChallengeRecord step_up_provider_not_configured
    `,
    challenge: `
      assertTrustedOrigin getCurrentUser getCurrentOrganizationForUser checkDistributedRateLimit
      createStepUpProviderChallenge recordStepUpAuditEvent event: 'step_up_challenge_created'
    `,
    verify: `
      assertTrustedOrigin getCurrentUser getCurrentOrganizationForUser checkDistributedRateLimit
      verifyStepUpProviderChallenge createStepUpTokenEnvelope persistStepUpTokenRecord
      recordStepUpAuditEvent event: 'step_up_verified'
    `,
    tokenMigration: `
      create table if not exists public.step_up_tokens
      nonce text primary key token_hash text not null
      check (expires_at <= verified_at + interval '5 minutes')
      consumed_at revoked_at enable row level security
      grant all on public.step_up_tokens to service_role
    `,
    challengeMigration: `
      create table if not exists public.step_up_challenges
      nonce_hash text not null unique
      check (expires_at <= issued_at + interval '2 minutes')
      consumed_at enable row level security
      grant all on public.step_up_challenges to service_role
    `,
    helperTest: `
      creates and accepts a signed scoped step-up token with nonce and expiry
      rejects replayed single-use request helper tokens
      rejects missing request helper tokens with no-store response
      rejects a tampered signed step-up token
      rejects a signed token scoped to another organization
      rejects a signed token scoped to another action
      rejects an expired signed step-up token
      fails closed when enterprise MFA/IdP provider is not configured
    `,
    scanner: `
      const protectedRoutes = [
      requireAwaitedStepUp
      Enterprise release blocked: execute the protected Step-Up Runtime Proof workflow
    `,
    routes: Object.fromEntries(
      STEP_UP_ROUTE_POLICIES.map(([key, , action]) => [key, routeSource(action)]),
    ),
  };
}

const githubChecks = {
  status: 'Complete',
  outcome: 'passed',
  targetSha: SHA,
  checks: [
    { name: 'fullSecuritySuite', status: 'PASS' },
    { name: 'requiredChecks', status: 'PASS' },
  ],
};

function build(overrides: Record<string, unknown> = {}) {
  const coverage = evaluateStepUpCoverage(completeSources());
  return buildStepUpEvidence({
    coverage,
    exactChecks: evaluateExactShaChecks(githubChecks, SHA),
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'agent/step-up-exact-sha-evidence',
    targetSha: SHA,
    observedSha: SHA,
    runId: '12345',
    githubActions: true,
    generatedAt: '2026-07-17T00:00:00.000Z',
    sourceDigests: { helper: 'digest', routes: {} },
    ...overrides,
  });
}

describe('step-up sensitive-action evidence', () => {
  it('recognizes centralized, provider-verified, single-use step-up coverage across protected routes', () => {
    const coverage = evaluateStepUpCoverage(completeSources());

    expect(coverage.complete).toBe(true);
    expect(coverage.routeResults).toHaveLength(STEP_UP_ROUTE_POLICIES.length);
    expect(coverage.routeResults.every((route) => route.passed)).toBe(true);
    expect(coverage.checks).toEqual({
      centralPolicy: true,
      providerVerification: true,
      challengeBoundary: true,
      verificationBoundary: true,
      singleUsePersistence: true,
      protectedRouteCoverage: true,
      negativeAndReplayTests: true,
    });
  });

  it('requires exact-SHA Full Security Suite and required-check evidence', () => {
    expect(evaluateExactShaChecks(githubChecks, SHA)).toEqual({
      evidenceComplete: true,
      exactSha: true,
      fullSecuritySuite: true,
      requiredChecks: true,
    });

    expect(evaluateExactShaChecks({ ...githubChecks, targetSha: 'b'.repeat(40) }, SHA).exactSha).toBe(false);
    expect(
      evaluateExactShaChecks({
        ...githubChecks,
        checks: [{ name: 'requiredChecks', status: 'PASS' }],
      }, SHA).fullSecuritySuite,
    ).toBe(false);
  });

  it('produces scorecard and legacy-checker compatible Complete evidence', () => {
    const evidence = build();

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.control).toBe('step-up-sensitive-actions');
    expect(evidence.redaction).toContain('access-granting values are redacted');
    expect(evidence.sensitiveActionsReviewed.map((item) => item.action)).toEqual([
      'billing',
      'exports',
      'team-management',
      'gdpr-delete',
    ]);
    expect(evidence.sensitiveActionsReviewed.every((item) => item.status === 'enforced')).toBe(true);
    expect(evidence.controlsVerified).toContain('Authorization is rechecked after step-up');
    expect(evidence.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      rawTokensStored: false,
      manualBooleanProofAccepted: false,
      liveProviderProofClaimed: false,
      exactShaBound: true,
    });
  });

  it('fails closed when any protected route lacks the awaited scoped guard', () => {
    const sources = completeSources();
    sources.routes.billingCheckout = `action: 'manage_billing' userId: organizationId:`;
    const coverage = evaluateStepUpCoverage(sources);
    const evidence = build({ coverage });

    expect(coverage.complete).toBe(false);
    expect(coverage.routeResults.find((route) => route.key === 'billingCheckout')?.passed).toBe(false);
    expect(evidence.status).toBe('Open');
    expect(evidence.failures).toContain('step-up source, route, migration, or test coverage is incomplete');
  });

  it('fails closed on untrusted provenance and never upgrades runtime MFA or SSO controls', () => {
    const evidence = build({
      observedSha: 'b'.repeat(40),
      githubActions: false,
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.failures).toContain('evidence must be generated by GitHub Actions');
    expect(evidence.failures).toContain('checked-out SHA must equal targetSha');
    expect(evidence.evidenceBoundary).toContain('does not prove that production Supabase MFA');
    expect(evidence.evidenceBoundary).toContain('administrator MFA and SSO controls');
    expect(JSON.stringify(evidence)).not.toContain(completeSources().helper);
  });
});
