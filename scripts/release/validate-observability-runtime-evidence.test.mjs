import { describe, expect, it } from 'vitest';

import { validateObservabilityRuntimeEvidence } from './validate-observability-runtime-evidence.mjs';

const now = new Date('2026-07-11T13:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'observability-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T12:00:00Z',
    releaseTarget: 'production',
    runtimeConfiguration: {
      targetCount: 1,
      sentryDsnConfigured: true,
      authenticatedSmokeEmissionEnabled: true,
      hasProtectedReadinessToken: true,
    },
    globalChecks: [
      { name: 'productionUrlConfigured', critical: true, passed: true },
      { name: 'sentryDsnConfigured', critical: true, passed: true },
    ],
    targets: [
      {
        passed: true,
        checks: [
          { name: 'observabilitySmokeRejectsAnonymous', critical: true, passed: true },
          { name: 'observabilitySmokeEventSent', critical: true, passed: true },
        ],
      },
    ],
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
    },
    ...overrides,
  };
}

describe('validateObservabilityRuntimeEvidence', () => {
  it('accepts fresh complete observability smoke evidence', () => {
    expect(validateObservabilityRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(
      validateObservabilityRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T12:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects expired exceptions', () => {
    expect(
      validateObservabilityRuntimeEvidence(
        {
          evidenceItem: 'observability-smoke-validation',
          status: 'Exception',
          generatedAt: '2026-07-11T12:00:00Z',
          exception: { expiresAt: '2026-07-10T23:59:59Z' },
        },
        { now },
      ),
    ).toContain('observability exception has expired');
  });

  it('requires authenticated event emission', () => {
    const evidence = completeEvidence();
    evidence.runtimeConfiguration.authenticatedSmokeEmissionEnabled = false;
    expect(validateObservabilityRuntimeEvidence(evidence, { now })).toContain(
      'runtimeConfiguration.authenticatedSmokeEmissionEnabled must be true',
    );
  });

  it('rejects missing Sentry configuration', () => {
    const evidence = completeEvidence();
    evidence.runtimeConfiguration.sentryDsnConfigured = false;
    expect(validateObservabilityRuntimeEvidence(evidence, { now })).toContain(
      'runtimeConfiguration.sentryDsnConfigured must be true',
    );
  });

  it('rejects a failed authenticated smoke check', () => {
    const evidence = completeEvidence();
    evidence.targets[0].checks[1].passed = false;
    expect(validateObservabilityRuntimeEvidence(evidence, { now })).toContain(
      'observabilitySmokeEventSent must pass',
    );
  });

  it('rejects evidence that stores authorization headers', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.authorizationHeaderStored = true;
    expect(validateObservabilityRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.authorizationHeaderStored must be false',
    );
  });
});
