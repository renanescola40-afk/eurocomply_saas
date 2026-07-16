import { describe, expect, it } from 'vitest';

import {
  buildAccessibilityConsentEvidence,
  evaluateAccessibilityConsentCoverage,
  evaluateExactShaChecks,
} from '../../scripts/enterprise/build-accessibility-consent-evidence.mjs';

const SHA = 'a'.repeat(40);

const completeSpec = `
test.describe('enterprise accessibility and analytics consent acceptance', () => {
  test('keyboard-only navigation reaches critical controls', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button')).toBeFocused();
  });
  test('semantic landmarks and accessible names support screen readers', async () => {
    const invalidAriaReferences = [];
    const unnamedInteractive = [];
    const unlabeledControls = [];
    const imagesMissingAlt = [];
  });
  test('analytics stays blocked before consent and decline persists', async () => {
    await expect(page.locator('#posthog-js-sdk')).toHaveCount(0);
  });
  test('analytics loads only after explicit consent', async () => {
    let analyticsRequests = 1;
    await expect.poll(() => analyticsRequests).toBeGreaterThan(0);
    await expect.poll(() => 'granted').toBe('granted');
  });
});
`;

const completeBanner = `
<div role="dialog" aria-labelledby={CONSENT_TITLE_ID} aria-describedby={CONSENT_DESCRIPTION_ID} />
dialogRef.current?.focus();
`;

const completeAnalytics = `
function hasAnalyticsConsent() { return true; }
export function denyAnalyticsConsent() {
  window.posthog?.stopSessionRecording?.();
  window.posthog?.opt_out_capturing?.();
}
export function updateSessionRecordingForPath() {
  if (!hasAnalyticsConsent()) {
    window.posthog?.stopSessionRecording?.();
  }
}
`;

const completeWorkflow = `
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT: 'true'
NEXT_PUBLIC_POSTHOG_KEY: phc_ci_synthetic_public_key
NEXT_PUBLIC_POSTHOG_HOST: https://analytics-ci.invalid
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

function coverage() {
  return evaluateAccessibilityConsentCoverage({
    specSource: completeSpec,
    bannerSource: completeBanner,
    analyticsSource: completeAnalytics,
    workflowSource: completeWorkflow,
  });
}

function build(overrides: Record<string, unknown> = {}) {
  return buildAccessibilityConsentEvidence({
    coverage: coverage(),
    exactChecks: evaluateExactShaChecks(githubChecks, SHA),
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'agent/accessibility-consent-evidence',
    targetSha: SHA,
    observedSha: SHA,
    runId: '12345',
    githubActions: true,
    generatedAt: '2026-07-16T00:00:00.000Z',
    sourceDigests: {
      acceptanceSpec: 'spec-digest',
      consentBanner: 'banner-digest',
      analyticsClient: 'analytics-digest',
      fullSecurityWorkflow: 'workflow-digest',
      githubChecks: 'checks-digest',
    },
    ...overrides,
  });
}

describe('accessibility and analytics consent evidence', () => {
  it('recognizes keyboard, semantic and consent runtime coverage', () => {
    const result = coverage();
    expect(result.keyboardCoverage).toBe(true);
    expect(result.screenReaderCoverage).toBe(true);
    expect(result.analyticsConsentCoverage).toBe(true);
    expect(result.checks).toMatchObject({
      dedicatedSuite: true,
      keyboardNavigation: true,
      screenReaderSemantics: true,
      consentDialogSemantics: true,
      preConsentBlocking: true,
      explicitGrantRequired: true,
      denialStopsRecording: true,
      replayConsentGuard: true,
      protectedRuntimeConfiguration: true,
    });
  });

  it('requires exact-SHA Full Security Suite and aggregate required checks', () => {
    expect(evaluateExactShaChecks(githubChecks, SHA)).toEqual({
      evidenceComplete: true,
      exactSha: true,
      fullSecuritySuite: true,
      requiredChecks: true,
    });
    expect(evaluateExactShaChecks({ ...githubChecks, targetSha: 'b'.repeat(40) }, SHA).exactSha).toBe(false);
    expect(
      evaluateExactShaChecks({ ...githubChecks, checks: [{ name: 'requiredChecks', status: 'PASS' }] }, SHA)
        .fullSecuritySuite,
    ).toBe(false);
  });

  it('produces scorecard-readable accessibility and analytics evidence', () => {
    const evidence = build();
    expect(evidence.accessibility.status).toBe('Complete');
    expect(evidence.analytics.status).toBe('Complete');
    expect(evidence.accessibility.checks).toEqual([
      { name: 'keyboard', passed: true },
      { name: 'screenReader', passed: true },
    ]);
    expect(evidence.analytics.controlsVerified).toEqual(['Analytics consent validated']);
    expect(JSON.stringify(evidence)).not.toContain(completeSpec);
  });

  it('fails closed when execution evidence or consent coverage is incomplete', () => {
    const incompleteChecks = buildAccessibilityConsentEvidence({
      coverage: coverage(),
      exactChecks: evaluateExactShaChecks({ ...githubChecks, status: 'Open' }, SHA),
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'agent/accessibility-consent-evidence',
      targetSha: SHA,
      observedSha: SHA,
      runId: '12345',
      githubActions: true,
      sourceDigests: {},
    });
    expect(incompleteChecks.accessibility.status).toBe('Open');
    expect(incompleteChecks.analytics.status).toBe('Open');

    const missingConsentGuard = evaluateAccessibilityConsentCoverage({
      specSource: completeSpec,
      bannerSource: completeBanner,
      analyticsSource: completeAnalytics.replace('if (!hasAnalyticsConsent())', 'if (false)'),
      workflowSource: completeWorkflow,
    });
    expect(missingConsentGuard.analyticsConsentCoverage).toBe(false);
  });

  it('fails closed on SHA mismatch', () => {
    const evidence = build({ observedSha: 'b'.repeat(40) });
    expect(evidence.accessibility.status).toBe('Open');
    expect(evidence.analytics.status).toBe('Open');
    expect(evidence.accessibility.failures).toContain('checked-out SHA must equal targetSha');
  });
});
