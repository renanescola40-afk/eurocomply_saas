import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildPublicUxEvidence,
  evaluateExactShaChecks,
  evaluatePublicUxCoverage,
} from '../../scripts/enterprise/build-public-ux-evidence.mjs';

const SHA = 'a'.repeat(40);

function repositorySources() {
  return {
    publicSpec: readFileSync('tests/e2e/enterprise-public-ux-acceptance.spec.ts', 'utf8'),
    authenticatedProductTest: readFileSync('tests/product/authenticated-product-ux.test.tsx', 'utf8'),
    criticalFlowSpec: readFileSync('tests/e2e/enterprise-critical-flows.spec.ts', 'utf8'),
    productJourneySpec: readFileSync('tests/e2e/product-critical-journeys.spec.ts', 'utf8'),
    onboardingPage: readFileSync('src/app/[locale]/onboarding/page.tsx', 'utf8'),
    onboardingComponent: readFileSync('src/components/onboarding/b2b-onboarding-flow.tsx', 'utf8'),
    dashboardPage: readFileSync('src/app/[locale]/dashboard/organizations/page.tsx', 'utf8'),
    dashboardComponent: readFileSync('src/components/dashboard/enterprise-compliance-command-center.tsx', 'utf8'),
  };
}

function repositoryCoverage(overrides: Record<string, string> = {}) {
  const sources = { ...repositorySources(), ...overrides };
  return evaluatePublicUxCoverage(sources.publicSpec, sources);
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
  const coverage = repositoryCoverage();
  const exactChecks = evaluateExactShaChecks(githubChecks, SHA);
  return buildPublicUxEvidence({
    coverage,
    exactChecks,
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'agent/authenticated-product-ux-proof',
    targetSha: SHA,
    observedSha: SHA,
    runId: '12345',
    githubActions: true,
    generatedAt: '2026-07-17T00:00:00.000Z',
    sourceDigests: {
      publicAcceptanceSpec: 'public-spec-digest',
      authenticatedProductTest: 'authenticated-test-digest',
      routing: 'routing-digest',
      playwrightConfig: 'playwright-digest',
      githubChecks: 'checks-digest',
    },
    ...overrides,
  });
}

describe('product UX evidence', () => {
  it('recognizes public, onboarding, dashboard and locale coverage from real sources', () => {
    const coverage = repositoryCoverage();

    expect(coverage.publicUxCoverage).toBe(true);
    expect(coverage.onboardingCoverage).toBe(true);
    expect(coverage.dashboardCoverage).toBe(true);
    expect(coverage.localizationCoverage).toBe(true);
    expect(coverage.checks).toMatchObject({
      landing: true,
      pricing: true,
      login: true,
      mobile: true,
      supportedLocales: true,
      controlledErrors: true,
      onboardingComponentAcceptance: true,
      onboardingSourceContract: true,
      onboardingRouteBoundary: true,
      dashboardComponentAcceptance: true,
      dashboardSourceContract: true,
      dashboardRouteBoundary: true,
    });
  });

  it('requires the exact-SHA Full Security Suite and aggregate required checks', () => {
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

  it('produces complete scorecard-readable product UX and localization evidence', () => {
    const evidence = build();

    expect(evidence.ux.status).toBe('Complete');
    expect(evidence.localization.status).toBe('Complete');
    expect(evidence.ux.checks).toEqual([
      { name: 'landing', passed: true },
      { name: 'pricing', passed: true },
      { name: 'login', passed: true },
      { name: 'mobile', passed: true },
      { name: 'onboarding', passed: true },
      { name: 'dashboard', passed: true },
    ]);
    expect(evidence.ux.controlsVerified).toContain('Onboarding UX acceptance validated');
    expect(evidence.ux.controlsVerified).toContain('Dashboard UX acceptance validated');
    expect(evidence.localization.controlsVerified).toEqual(['Supported locales validated']);
    expect(evidence.ux.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      customerDataStored: false,
      productionSessionStored: false,
      exactShaBound: true,
    });
    expect(evidence.ux.evidenceBoundary).toContain('does not create an authentication bypass');
    expect(evidence.ux.evidenceBoundary).toContain('does not');
  });

  it('fails closed when required execution evidence is incomplete', () => {
    const evidence = buildPublicUxEvidence({
      coverage: repositoryCoverage(),
      exactChecks: evaluateExactShaChecks({ ...githubChecks, status: 'Open' }, SHA),
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'agent/authenticated-product-ux-proof',
      targetSha: SHA,
      observedSha: SHA,
      runId: '12345',
      githubActions: true,
      sourceDigests: {},
    });

    expect(evidence.ux.status).toBe('Open');
    expect(evidence.localization.status).toBe('Open');
    expect(evidence.ux.checks.every((check) => check.passed === false)).toBe(true);
  });

  it('fails closed when onboarding or dashboard acceptance coverage regresses', () => {
    const withoutOnboarding = repositoryCoverage({
      authenticatedProductTest: repositorySources().authenticatedProductTest.replace(
        "describe('authenticated onboarding UX acceptance'",
        "describe('removed onboarding UX acceptance'",
      ),
    });
    const withoutDashboard = repositoryCoverage({
      dashboardComponent: repositorySources().dashboardComponent.replace(
        'aria-labelledby="enterprise-command-center-title"',
        'aria-label="command center"',
      ),
    });

    expect(withoutOnboarding.onboardingCoverage).toBe(false);
    expect(withoutDashboard.dashboardCoverage).toBe(false);

    const onboardingEvidence = build({ coverage: withoutOnboarding });
    const dashboardEvidence = build({ coverage: withoutDashboard });
    expect(onboardingEvidence.ux.status).toBe('Open');
    expect(dashboardEvidence.ux.status).toBe('Open');
  });

  it('fails closed when a supported locale or exact-SHA provenance is missing', () => {
    const sources = repositorySources();
    const incompleteCoverage = repositoryCoverage({
      publicSpec: sources.publicSpec.replace("'de'", "'nl'"),
    });
    expect(incompleteCoverage.localizationCoverage).toBe(false);

    const evidence = build({ observedSha: 'b'.repeat(40) });
    expect(evidence.ux.status).toBe('Open');
    expect(evidence.localization.status).toBe('Open');
    expect(evidence.ux.failures).toContain('checked-out SHA must equal targetSha');
  });
});
