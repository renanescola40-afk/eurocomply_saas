import { describe, expect, it } from 'vitest';
import {
  requiredFinalValidationCommands,
  validateFinalValidationRuntimeEvidence,
} from './validate-final-validation-runtime-evidence.mjs';
import { buildFinalValidationRunnerEvidence } from './write-final-validation-runner-evidence.mjs';

const now = new Date('2026-07-15T12:00:00Z');
const commitSha = 'a'.repeat(40);

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'final-validation-runner',
    status: 'Complete',
    outcome: 'passed',
    releaseDecision: 'Go',
    generatedAt: '2026-07-15T11:30:00Z',
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29400000000',
      commitSha,
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

function writerInputs(overrides = {}) {
  return {
    productionFinal: {
      status: 'Complete',
      outcome: 'passed',
      commitSha,
      buildSha: commitSha,
      releaseTarget: 'enterprise',
      commands: requiredFinalValidationCommands.map((command) => ({ command, result: 'passed' })),
    },
    enterpriseRuntime: { status: 'Complete', outcome: 'passed' },
    releaseGoNoGo: { status: 'Complete', finalDecision: 'Go' },
    openItems: [],
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
      GITHUB_REF_NAME: 'main',
      GITHUB_RUN_ID: '29400000000',
      GITHUB_SHA: commitSha,
      RELEASE_TARGET: 'enterprise',
    },
    generatedAt: '2026-07-15T11:30:00Z',
    ...overrides,
  };
}

describe('validateFinalValidationRuntimeEvidence', () => {
  it('accepts fresh commit-bound final validation proof', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('accepts Open evidence only as blocked or not_verified', () => {
    expect(validateFinalValidationRuntimeEvidence({
      evidenceItem: 'final-validation-runner',
      status: 'Open',
      outcome: 'blocked',
      releaseDecision: 'No-Go',
      generatedAt: '2026-07-15T11:30:00Z',
    }, { now })).toEqual([]);
  });

  it('rejects contradictory Open/failed evidence', () => {
    expect(validateFinalValidationRuntimeEvidence({
      evidenceItem: 'final-validation-runner',
      status: 'Open',
      outcome: 'failed',
      releaseDecision: 'No-Go',
      generatedAt: '2026-07-15T11:30:00Z',
    }, { now })).toContain('Open evidence outcome must be blocked or not_verified');
  });

  it('rejects a Go decision while evidence remains Open', () => {
    expect(validateFinalValidationRuntimeEvidence({
      evidenceItem: 'final-validation-runner',
      status: 'Open',
      outcome: 'blocked',
      releaseDecision: 'Go',
      generatedAt: '2026-07-15T11:30:00Z',
    }, { now })).toContain('Open evidence releaseDecision must not be Go');
  });

  it('rejects unknown evidence states', () => {
    expect(validateFinalValidationRuntimeEvidence({
      evidenceItem: 'final-validation-runner',
      status: 'Pending',
      outcome: 'blocked',
      generatedAt: '2026-07-15T11:30:00Z',
    }, { now })).toContain('status must be Open, Exception or Complete');
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

  it('writer produces Complete evidence that its validator accepts', () => {
    const evidence = buildFinalValidationRunnerEvidence(writerInputs());

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.releaseDecision).toBe('Go');
    expect(evidence.failures).toEqual([]);
    expect(evidence.runtimeContext).toMatchObject({
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29400000000',
      commitSha,
    });
    expect(validateFinalValidationRuntimeEvidence(evidence, {
      now,
      expectedCommitSha: commitSha,
    })).toEqual([]);
  });

  it('writer refuses Complete status outside trusted main-branch GitHub Actions provenance', () => {
    const evidence = buildFinalValidationRunnerEvidence(writerInputs({
      env: {
        GITHUB_SHA: commitSha,
        RELEASE_TARGET: 'enterprise',
      },
    }));

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('blocked');
    expect(evidence.releaseDecision).toBe('No-Go');
    expect(evidence.failures).toContain('final evidence must be generated by GitHub Actions');
    expect(evidence.evidenceIntegrity.placeholderOnly).toBe(false);
  });
});
