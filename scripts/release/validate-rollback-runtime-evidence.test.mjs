import { describe, expect, it } from 'vitest';

import { validateRollbackRuntimeEvidence } from './validate-rollback-runtime-evidence.mjs';

const now = new Date('2026-07-11T15:00:00Z');

function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'rollback-dry-run-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-07-11T14:00:00Z',
    releaseTarget: 'production',
    runtimeContext: {
      generatedByGithubActions: true,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      githubRunId: '29160000000',
      commitSha: 'a'.repeat(40),
    },
    dryRun: {
      mutatesProduction: false,
      commandExecuted: true,
    },
    targetValidation: {
      passed: true,
      targetConfigured: true,
      targetShaConfigured: true,
      targetDiffersFromCurrentRelease: true,
      healthOk: true,
      healthNoStore: true,
      readyCheckRequired: true,
      readyOk: true,
    },
    runbook: { present: true },
    functionalValidation: { recorded: true },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rollbackTargetStored: false,
    },
    ...overrides,
  };
}

describe('validateRollbackRuntimeEvidence', () => {
  it('accepts fresh complete rollback proof for main', () => {
    expect(validateRollbackRuntimeEvidence(completeEvidence(), { now })).toEqual([]);
  });

  it('rejects stale rollback evidence', () => {
    expect(
      validateRollbackRuntimeEvidence(
        completeEvidence({ generatedAt: '2026-07-01T14:00:00Z' }),
        { now },
      ),
    ).toContain('generatedAt is older than 7 days');
  });

  it('rejects a rollback target equal to the current release', () => {
    const evidence = completeEvidence();
    evidence.targetValidation.targetDiffersFromCurrentRelease = false;
    expect(validateRollbackRuntimeEvidence(evidence, { now })).toContain(
      'targetValidation.targetDiffersFromCurrentRelease must be true',
    );
  });

  it('rejects a dry-run that may mutate production', () => {
    const evidence = completeEvidence();
    evidence.dryRun.mutatesProduction = true;
    expect(validateRollbackRuntimeEvidence(evidence, { now })).toContain(
      'dryRun.mutatesProduction must be false',
    );
  });

  it('rejects missing health no-store proof', () => {
    const evidence = completeEvidence();
    evidence.targetValidation.healthNoStore = false;
    expect(validateRollbackRuntimeEvidence(evidence, { now })).toContain(
      'targetValidation.healthNoStore must be true',
    );
  });

  it('requires readiness success when the ready check is enabled', () => {
    const evidence = completeEvidence();
    evidence.targetValidation.readyOk = false;
    expect(validateRollbackRuntimeEvidence(evidence, { now })).toContain(
      'targetValidation.readyOk must be true when readyCheckRequired=true',
    );
  });

  it('rejects evidence that stores the rollback target', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.rollbackTargetStored = true;
    expect(validateRollbackRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.rollbackTargetStored must be false',
    );
  });
});
