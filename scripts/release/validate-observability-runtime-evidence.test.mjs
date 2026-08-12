import { describe, expect, it } from 'vitest';

import { validateObservabilityRuntimeEvidence } from './validate-observability-runtime-evidence.mjs';

const now = new Date('2026-07-11T13:00:00Z');
const SHA = 'a'.repeat(40);

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'observability-smoke-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T12:00:00Z',
    releaseTarget: 'production',
    commitSha: SHA,
    buildSha: SHA,
    runtimeConfiguration: {
      targetCount: 1,
      sentryDsnConfigured: true,
      authenticatedSmokeEmissionEnabled: true,
      hasProtectedReadinessToken: true,
      exactShaBound: true,
    },
    globalChecks: [
      { name: 'productionUrlConfigured', critical: true, passed: true },
      { name: 'sentryDsnConfigured', critical: true, passed: true },
      { name: 'releaseShaBindingValid', critical: true, passed: true },
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
      exactShaBound: true,
    },
    ...overrides,
  };
}

describe('validateObservabilityRuntimeEvidence', () => {
  it('accepts fresh complete exact-SHA observability smoke evidence', () => {
    expect(validateObservabilityRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('accepts authenticated public-production evidence under the same strict controls', () => {
    expect(
      validateObservabilityRuntimeEvidence(
        completeEvidence({ releaseTarget: 'public-production' }),
        { now },
      ),
    ).toEqual([]);
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

  it('rejects observability evidence without exact commit and build SHA binding', () => {
    const evidence = completeEvidence({ commitSha: null, buildSha: null });
    evidence.runtimeConfiguration.exactShaBound = false;
    evidence.evidenceIntegrity.exactShaBound = false;
    const failures = validateObservabilityRuntimeEvidence(evidence, { now });
    expect(failures).toContain('commitSha must be a full lowercase SHA');
    expect(failures).toContain('buildSha must be a full lowercase SHA');
    expect(failures).toContain('runtimeConfiguration.exactShaBound must be true');
    expect(failures).toContain('evidenceIntegrity.exactShaBound must be true');
  });

  it('rejects build provenance that differs from the promoted commit', () => {
    const evidence = completeEvidence({ buildSha: 'b'.repeat(40) });
    expect(validateObservabilityRuntimeEvidence(evidence, { now })).toContain(
      'buildSha must match commitSha',
    );
  });
});
