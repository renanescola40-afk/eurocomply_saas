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
    releaseTarget: 'enterprise',
    generatedAt: '2026-07-15T11:30:00Z',
    targetCommit: commitSha,
    commitSha,
    buildSha: commitSha,
    noSecretsStored: true,
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29400000000',
      commitSha,
    },
    commands: requiredFinalValidationCommands.map((command) => ({ command, result: 'passed' })),
    evidenceSources: {
      productionFinalValidation: { status: 'Complete', outcome: 'passed' },
      enterpriseRuntimeEvidence: { status: 'Complete', outcome: 'passed' },
      releaseGoNoGo: { status: 'Complete', finalDecision: 'Go' },
    },
    register: { allComplete: true, openItems: [] },
    blockingReasons: { missingCommands: [], openItems: [], provenance: [] },
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
      RELEASE_BUILD_SHA: commitSha,
      RELEASE_TARGET: 'enterprise',
    },
    generatedAt: '2026-07-15T11:30:00Z',
    ...overrides,
  };
}

describe('validateFinalValidationRuntimeEvidence', () => {
  it('accepts fresh, internally coherent, commit-bound final validation proof', () => {
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

  it('rejects non-numeric GitHub run provenance', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.githubRunId = 'manual-run';
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('runtimeContext.githubRunId must be numeric');
  });

  it('rejects a non-enterprise release target', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence({ releaseTarget: 'preview' }), { now }))
      .toContain('releaseTarget must be enterprise');
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

  it('rejects expected commit mismatch', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence(), { now, expectedCommitSha: 'b'.repeat(40) }))
      .toContain(`runtime commit SHA must match ${'b'.repeat(40)}`);
  });

  it('rejects target, commit, and build SHA divergence', () => {
    expect(validateFinalValidationRuntimeEvidence(completeEvidence({ targetCommit: 'b'.repeat(40) }), { now }))
      .toContain('targetCommit must match runtime commit SHA');
    expect(validateFinalValidationRuntimeEvidence(completeEvidence({ commitSha: 'b'.repeat(40) }), { now }))
      .toContain('commitSha must match runtime commit SHA');
    expect(validateFinalValidationRuntimeEvidence(completeEvidence({ buildSha: 'b'.repeat(40) }), { now }))
      .toContain('buildSha must match runtime commit SHA');
  });

  it('rejects incomplete source evidence', () => {
    const evidence = completeEvidence();
    evidence.evidenceSources.enterpriseRuntimeEvidence.outcome = 'blocked';
    expect(validateFinalValidationRuntimeEvidence(evidence, { now }))
      .toContain('evidenceSources.enterpriseRuntimeEvidence must be Complete/passed');
  });

  it('rejects open register and unresolved blocking reasons', () => {
    const registerOpen = completeEvidence();
    registerOpen.register = { allComplete: false, openItems: ['RLS runtime: Open'] };
    expect(validateFinalValidationRuntimeEvidence(registerOpen, { now })).toEqual(
      expect.arrayContaining(['register.allComplete must be true', 'register.openItems must be empty']),
    );

    const blocked = completeEvidence();
    blocked.blockingReasons.provenance = ['main branch not verified'];
    expect(validateFinalValidationRuntimeEvidence(blocked, { now }))
      .toContain('blockingReasons.provenance must be empty');
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
    expect(evidence).toMatchObject({
      releaseTarget: 'enterprise',
      targetCommit: commitSha,
      commitSha,
      buildSha: commitSha,
      register: { allComplete: true, openItems: [] },
      blockingReasons: { missingCommands: [], openItems: [], provenance: [] },
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

  it('writer refuses Complete when build SHA or release target diverges', () => {
    const mismatchedBuild = buildFinalValidationRunnerEvidence(writerInputs({
      env: {
        ...writerInputs().env,
        RELEASE_BUILD_SHA: 'b'.repeat(40),
      },
    }));
    expect(mismatchedBuild.status).toBe('Open');
    expect(mismatchedBuild.failures).toContain('build SHA must match target commit');

    const wrongTarget = buildFinalValidationRunnerEvidence(writerInputs({
      env: {
        ...writerInputs().env,
        RELEASE_TARGET: 'preview',
      },
    }));
    expect(wrongTarget.status).toBe('Open');
    expect(wrongTarget.failures).toContain('release target must be enterprise');
  });
});
