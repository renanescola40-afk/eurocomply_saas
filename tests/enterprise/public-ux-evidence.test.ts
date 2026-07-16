import { describe, expect, it } from 'vitest';

import {
  buildPublicUxEvidence,
  evaluateExactShaChecks,
  evaluatePublicUxCoverage,
} from '../../scripts/enterprise/build-public-ux-evidence.mjs';

const SHA = 'a'.repeat(40);

const completeSpec = `
const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'it', 'de'];
test.describe('enterprise public UX acceptance', () => {
  test('landing is localized, healthy and conversion-ready', async ({ page }) => {
    await page.locator('#waitlist-form');
    await page.locator('h1');
  });
  test('pricing is localized, healthy and actionable', async () => {
    const path = '/pricing';
    const label = 'actionable controls';
  });
  test('login is localized, healthy and usable', async ({ page }) => {
    await page.locator('input[type="email"]');
    await page.locator('input[type="password"]');
    await page.getByRole('button', { name: /google/i });
  });
  test('mobile public conversion surfaces', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, 'mobile');
  });
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  const message = 'retain the locale prefix';
  const errors = 'Unhandled Runtime Error /undefined visible placeholder links';
});
`;

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
  const coverage = evaluatePublicUxCoverage(completeSpec);
  const exactChecks = evaluateExactShaChecks(githubChecks, SHA);
  return buildPublicUxEvidence({
    coverage,
    exactChecks,
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'agent/public-ux-acceptance-evidence',
    targetSha: SHA,
    observedSha: SHA,
    runId: '12345',
    githubActions: true,
    generatedAt: '2026-07-16T00:00:00.000Z',
    sourceDigests: {
      acceptanceSpec: 'spec-digest',
      routing: 'routing-digest',
      playwrightConfig: 'playwright-digest',
      githubChecks: 'checks-digest',
    },
    ...overrides,
  });
}

describe('public UX evidence', () => {
  it('recognizes the dedicated public UX and locale coverage', () => {
    const coverage = evaluatePublicUxCoverage(completeSpec);
    expect(coverage.publicUxCoverage).toBe(true);
    expect(coverage.localizationCoverage).toBe(true);
    expect(coverage.checks).toMatchObject({
      landing: true,
      pricing: true,
      login: true,
      mobile: true,
      supportedLocales: true,
      controlledErrors: true,
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

  it('produces complete scorecard-readable UX and localization evidence', () => {
    const evidence = build();
    expect(evidence.ux.status).toBe('Complete');
    expect(evidence.localization.status).toBe('Complete');
    expect(evidence.ux.checks).toEqual([
      { name: 'landing', passed: true },
      { name: 'pricing', passed: true },
      { name: 'login', passed: true },
      { name: 'mobile', passed: true },
    ]);
    expect(evidence.localization.controlsVerified).toEqual(['Supported locales validated']);
    expect(JSON.stringify(evidence)).not.toContain(completeSpec);
  });

  it('fails closed when required execution evidence is incomplete', () => {
    const coverage = evaluatePublicUxCoverage(completeSpec);
    const evidence = buildPublicUxEvidence({
      coverage,
      exactChecks: evaluateExactShaChecks({ ...githubChecks, status: 'Open' }, SHA),
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'agent/public-ux-acceptance-evidence',
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

  it('fails closed when a supported locale or exact-SHA provenance is missing', () => {
    const incompleteCoverage = evaluatePublicUxCoverage(completeSpec.replace("'de'", "'nl'"));
    expect(incompleteCoverage.localizationCoverage).toBe(false);

    const evidence = build({ observedSha: 'b'.repeat(40) });
    expect(evidence.ux.status).toBe('Open');
    expect(evidence.localization.status).toBe('Open');
    expect(evidence.ux.failures).toContain('checked-out SHA must equal targetSha');
  });
});
