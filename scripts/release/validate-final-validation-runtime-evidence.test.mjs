import { describe, expect, it } from 'vitest';
import {
  requiredFinalValidationCommands,
  validateFinalValidationRuntimeEvidence,
} from './validate-final-validation-runtime-evidence.mjs';

const now = new Date('2026-07-11T18:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'final-validation-runner',
    status: 'Complete',
    outcome: 'passed',
    releaseDecision: 'Go',
    generatedAt: '2026-07-11T17:30:00Z',
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29200000000',
      commitSha: 'a'.repeat(40),
    },
    commands: requiredFinalValidationCommands.map((command) => ({ command, result: 'passed' })),
    failures: [],
    evidenceIntegrity: {
      placeholderOnly: false,
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawUrlsStored: false,
    },
    ...overrides,
  };
}

describe('validateFinalValidationRuntimeEvidence', () => {
  it('accepts fresh commit-bound final validation proof', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale evidence', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence({ generatedAt: '2026-07-01T17:30:00Z' }), { now }))
      .toContain('generatedAt is older than 7 days');
  });

  it('rejects placeholder evidence marked complete', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.placeholderOnly = true;
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.placeholderOnly must be false');
  });

  it('rejects feature-branch provenance', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.branch = 'feature/example';
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('runtimeContext.branch must be main');
  });

  it('rejects a missing required command', () => {
    const evidence = completeEvidence();
    evidence.commands = evidence.commands.filter((entry) => entry.command !== 'npm run test:e2e');
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('commands must contain exactly one passing npm run test:e2e');
  });

  it('rejects duplicate command proof', () => {
    const evidence = completeEvidence();
    evidence.commands.push({ command: 'npm ci', result: 'passed' });
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('commands must contain exactly one passing npm ci');
  });

  it('rejects commit mismatch', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence(), { now, expectedCommitSha: 'b'.repeat(40) }))
      .toContain(`runtime commit SHA must match ${'b'.repeat(40)}`);
  });

  it('rejects stored raw URLs', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.rawUrlsStored = true;
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('evidenceIntegrity.rawUrlsStored must be false');
  });
});
