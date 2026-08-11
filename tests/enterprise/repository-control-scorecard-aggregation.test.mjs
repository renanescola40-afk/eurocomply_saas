import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  REPOSITORY_CONTROL_OUTPUTS,
  repositoryControlBuilderExitIsAcceptable,
  validateRepositoryControlAggregationOutputs,
} from '../../scripts/enterprise/run-repository-control-evidence-for-scorecard.mjs';

const SHA = 'a'.repeat(40);
const STALE = 'b'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

async function withEvidence(statuses, mutate = null) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repository-control-aggregation-'));
  try {
    for (const [index, relativePath] of REPOSITORY_CONTROL_OUTPUTS.entries()) {
      const status = statuses[index] ?? 'Open';
      const document = {
        schema: `test.repository-control.${index}.v1`,
        evidenceItem: `repository-control-${index}`,
        status,
        outcome: status === 'Complete' ? 'passed' : 'not_verified',
        repository: REPOSITORY,
        branch: 'main',
        targetSha: SHA,
        observedSha: SHA,
        evidenceIntegrity: {
          containsSensitiveValues: false,
          exactShaBound: true,
        },
      };
      mutate?.(document, index, relativePath);
      const absolutePath = path.join(root, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`);
    }
    return await arguments[2]?.(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function createRoot({ statuses = [], mutate } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repository-control-aggregation-'));
  for (const [index, relativePath] of REPOSITORY_CONTROL_OUTPUTS.entries()) {
    const status = statuses[index] ?? 'Open';
    const document = {
      schema: `test.repository-control.${index}.v1`,
      evidenceItem: `repository-control-${index}`,
      status,
      outcome: status === 'Complete' ? 'passed' : 'not_verified',
      repository: REPOSITORY,
      branch: 'main',
      targetSha: SHA,
      observedSha: SHA,
      evidenceIntegrity: {
        containsSensitiveValues: false,
        exactShaBound: true,
      },
    };
    mutate?.(document, index, relativePath);
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`);
  }
  return root;
}

test('aggregation accepts builder exit 1 only when all outputs are exact-SHA safe Open/Complete evidence', async () => {
  const root = await createRoot({ statuses: ['Complete'] });
  try {
    const validation = validateRepositoryControlAggregationOutputs({
      root,
      targetSha: SHA,
      repository: REPOSITORY,
    });
    assert.equal(validation.passed, true);
    assert.equal(validation.completeCount, 1);
    assert.equal(validation.openCount, REPOSITORY_CONTROL_OUTPUTS.length - 1);
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: 1, validation }), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('aggregation accepts builder exit 0 only when every output is Complete', async () => {
  const root = await createRoot({ statuses: Array(REPOSITORY_CONTROL_OUTPUTS.length).fill('Complete') });
  try {
    const validation = validateRepositoryControlAggregationOutputs({ root, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, true);
    assert.equal(validation.openCount, 0);
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: 0, validation }), true);
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: 1, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stale-SHA output remains fatal instead of being aggregated', async () => {
  const root = await createRoot({
    mutate(document, index) {
      if (index === 3) {
        document.targetSha = STALE;
        document.observedSha = STALE;
      }
    },
  });
  try {
    const validation = validateRepositoryControlAggregationOutputs({ root, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, false);
    assert.ok(validation.failures.some((failure) => failure.includes('target_sha_mismatch')));
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: 1, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sensitive evidence remains fatal instead of being aggregated', async () => {
  const root = await createRoot({
    mutate(document, index) {
      if (index === 5) document.evidenceIntegrity.containsSensitiveValues = true;
    },
  });
  try {
    const validation = validateRepositoryControlAggregationOutputs({ root, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, false);
    assert.ok(validation.failures.some((failure) => failure.includes('sensitive_evidence_rejected')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unexpected builder exit never becomes a scorecard-only soft failure', async () => {
  const root = await createRoot();
  try {
    const validation = validateRepositoryControlAggregationOutputs({ root, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, true);
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: 2, validation }), false);
    assert.equal(repositoryControlBuilderExitIsAcceptable({ builderExitCode: null, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
