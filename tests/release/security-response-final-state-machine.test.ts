import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  applySecurityResponseStatus,
  recordSecurityResponseFinalEvidence,
} from '../../scripts/release/record-security-response-final-evidence.mjs';

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
        overallResult: 'passed',
        metadataFailures: ['stale execution-only failure'],
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

  it('patches available evidence documents while ignoring only missing paths', () => {
    const directory = mkdtempSync(join(tmpdir(), 'security-response-evidence-'));
    const availablePath = join(directory, 'production-final-validation.json');
    const missingPath = join(directory, 'missing-final-validation.json');

    writeFileSync(
      availablePath,
      JSON.stringify({
        evidenceItem: 'production-final-validation',
        status: 'Complete',
        outcome: 'passed',
        overallResult: 'passed',
      }),
    );

    const result = recordSecurityResponseFinalEvidence({
      passed: true,
      generatedAt,
      paths: [missingPath, availablePath],
    });
    const patched = JSON.parse(readFileSync(availablePath, 'utf8'));

    expect(result).toEqual({ patched: 1, passed: true });
    expect(patched.securityResponseEvidence).toMatchObject({
      status: 'Complete',
      outcome: 'passed',
      generatedAt,
    });
  });

  it('fails closed when an available evidence document is malformed', () => {
    const directory = mkdtempSync(join(tmpdir(), 'security-response-evidence-invalid-'));
    const invalidPath = join(directory, 'invalid.json');
    writeFileSync(invalidPath, '{not-valid-json');

    expect(() =>
      recordSecurityResponseFinalEvidence({
        passed: true,
        generatedAt,
        paths: [invalidPath],
      }),
    ).toThrow(SyntaxError);
  });
});
