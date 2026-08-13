import { describe, expect, it } from 'vitest';

import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-distributed-rate-limit-evidence.mjs';

const sha = 'a569e82f14f37a1477c15713dfb6bde9c3f5fec8';
const repository = 'renanescola40-afk/eurocomply_saas';
const workflowPath = '.github/workflows/distributed-rate-limit-runtime-proof.yml';

function runtimeRun(overrides = {}) {
  return {
    id: 31648461304,
    name: `Distributed rate-limit proof for ${sha}`,
    display_title: `Distributed rate-limit proof for ${sha}`,
    path: workflowPath,
    head_branch: 'main',
    head_sha: sha,
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-08-12T22:48:28Z',
    updated_at: '2026-08-12T22:54:15Z',
    ...overrides,
  };
}

function passingEvidence(overrides = {}) {
  return {
    status: 'Complete',
    productionValidated: true,
    generatedFromRealEvidence: true,
    repository,
    targetSha: sha,
    observedSha: sha,
    sourceWorkflow: {
      name: 'Distributed Rate Limit Runtime Proof',
      runId: '31648461304',
    },
    failures: [],
    validation: { result: 'pass' },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      redisUrlStored: false,
      redisTokenStored: false,
      rawRedisKeyStored: false,
      exactShaBound: true,
    },
    checks: [{ name: 'sharedAcrossProcesses', passed: true }],
    ...overrides,
  };
}

describe('distributed rate-limit exact-SHA runtime provenance', () => {
  it('accepts the canonical workflow path when GitHub exposes dynamic run-name as run.name', () => {
    const run = runtimeRun();
    expect(run.name).not.toBe('Distributed Rate Limit Runtime Proof');
    expect(selectExactShaRun([run], sha)).toEqual(run);
  });

  it('rejects a successful exact-SHA run from a different workflow path', () => {
    const run = runtimeRun({ path: '.github/workflows/another-runtime-proof.yml' });
    expect(selectExactShaRun([run], sha)).toBeNull();
  });

  it('still binds an explicitly supplied source run id', () => {
    expect(selectExactShaRun([runtimeRun()], sha, '31648461304')?.id).toBe(31648461304);
    expect(selectExactShaRun([runtimeRun()], sha, '999999')).toBeNull();
  });

  it('keeps the internal evidence workflow identity strict and independent of GitHub run-name', () => {
    expect(validateDownloadedEvidence(passingEvidence(), {
      targetSha: sha,
      repository,
      runId: '31648461304',
    })).toEqual({ passed: true, failures: [] });

    const invalid = validateDownloadedEvidence(
      passingEvidence({
        sourceWorkflow: {
          name: `Distributed rate-limit proof for ${sha}`,
          runId: '31648461304',
        },
      }),
      { targetSha: sha, repository, runId: '31648461304' },
    );

    expect(invalid.passed).toBe(false);
    expect(invalid.failures).toContain('source_workflow_name_invalid');
  });
});
