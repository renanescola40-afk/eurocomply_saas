import { describe, expect, it } from 'vitest';

import { applySecurityResponseStatus } from '../../scripts/release/record-security-response-final-evidence.mjs';

const generatedAt = '2026-07-15T10:00:00.000Z';

describe('security response final evidence state machine', () => {
  it('keeps an actual production-final execution failure as Open/failed', () => {
    const result = applySecurityResponseStatus(
      {
        evidenceItem: 'production-final-validation',
        status: 'Complete',
        outcome: 'passed',
        overallResult: 'passed',
      },
      { passed: false, generatedAt },
    );

    expect(result).toMatchObject({
      status: 'Open',
      outcome: 'failed',
      overallResult: 'failed',
      securityResponseEvidence: {
        status: 'Open',
        outcome: 'failed',
      },
    });
    expect(result.releaseGate).toContain('No-Go');
    expect(result.metadataFailures).toContain(
      'Runtime security response evidence is missing, stale, SHA-mismatched, runtime-unbound, or failed.',
    );
  });

  it('keeps final-validation-runner compatible with Open/blocked/No-Go semantics', () => {
    const result = applySecurityResponseStatus(
      {
        evidenceItem: 'final-validation-runner',
        status: 'Complete',
        outcome: 'passed',
        releaseDecision: 'Go',
        failures: [],
      },
      { passed: false, generatedAt },
    );

    expect(result).toMatchObject({
      status: 'Open',
      outcome: 'blocked',
      releaseDecision: 'No-Go',
      securityResponseEvidence: {
        status: 'Open',
        outcome: 'failed',
      },
    });
    expect(result.productionGate).toContain('No-Go');
    expect(result.failures).toContain(
      'Runtime security response evidence is missing, stale, SHA-mismatched, runtime-unbound, or failed.',
    );
    expect(result).not.toHaveProperty('overallResult');
    expect(result).not.toHaveProperty('metadataFailures');
  });
});
