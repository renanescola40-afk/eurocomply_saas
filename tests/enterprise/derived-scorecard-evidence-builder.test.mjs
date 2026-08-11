import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DERIVED_SCORECARD_BUILDERS,
  derivedBuilderExitIsAcceptable,
  getDerivedScorecardBuilder,
  validateDerivedScorecardBuilderOutputs,
} from '../../scripts/enterprise/run-derived-scorecard-evidence-builder.mjs';

const SHA = 'a'.repeat(40);
const STALE = 'b'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

async function createOutputs(key, { statuses = [], mutate, omitIndex = -1 } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'derived-scorecard-aggregation-'));
  const descriptor = getDerivedScorecardBuilder(key);

  for (const [index, relativePath] of descriptor.outputs.entries()) {
    if (index === omitIndex) continue;
    const status = statuses[index] ?? 'Open';
    const document = {
      schema: `test.${key}.${index}.v1`,
      evidenceItem: `${key}-${index}`,
      status,
      outcome: status === 'Complete' ? 'passed' : 'not_verified',
      repository: REPOSITORY,
      branch: 'feature/test',
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

  return { root, descriptor };
}

test('derived scorecard builder keys are explicit and unknown builders are rejected', () => {
  assert.deepEqual(Object.keys(DERIVED_SCORECARD_BUILDERS).sort(), [
    'accessibilityConsent',
    'accountRecovery',
    'providerFailure',
    'publicUx',
    'stepUp',
  ]);
  assert.throws(() => getDerivedScorecardBuilder('../arbitrary-script'), /not_allowlisted/);
});

test('exit 1 is accepted only for safe exact-SHA Open/Complete derived evidence', async () => {
  const { root, descriptor } = await createOutputs('publicUx', { statuses: ['Complete', 'Open'] });
  try {
    const validation = validateDerivedScorecardBuilderOutputs({
      root,
      descriptor,
      targetSha: SHA,
      repository: REPOSITORY,
    });
    assert.equal(validation.passed, true);
    assert.equal(validation.completeCount, 1);
    assert.equal(validation.openCount, 1);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 1, validation }), true);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 0, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('exit 0 is accepted only when every derived output is Complete', async () => {
  const descriptor = getDerivedScorecardBuilder('accessibilityConsent');
  const { root } = await createOutputs('accessibilityConsent', {
    statuses: Array(descriptor.outputs.length).fill('Complete'),
  });
  try {
    const validation = validateDerivedScorecardBuilderOutputs({ root, descriptor, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, true);
    assert.equal(validation.openCount, 0);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 0, validation }), true);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 1, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stale SHA remains fatal', async () => {
  const { root, descriptor } = await createOutputs('accountRecovery', {
    mutate(document) {
      document.targetSha = STALE;
      document.observedSha = STALE;
    },
  });
  try {
    const validation = validateDerivedScorecardBuilderOutputs({ root, descriptor, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, false);
    assert.ok(validation.failures.some((failure) => failure.includes('target_sha_mismatch')));
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 1, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sensitive evidence remains fatal', async () => {
  const { root, descriptor } = await createOutputs('providerFailure', {
    mutate(document) {
      document.evidenceIntegrity.containsSensitiveValues = true;
    },
  });
  try {
    const validation = validateDerivedScorecardBuilderOutputs({ root, descriptor, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, false);
    assert.ok(validation.failures.some((failure) => failure.includes('sensitive_evidence_boundary_invalid')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('missing output remains fatal', async () => {
  const { root, descriptor } = await createOutputs('publicUx', { omitIndex: 1 });
  try {
    const validation = validateDerivedScorecardBuilderOutputs({ root, descriptor, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, false);
    assert.ok(validation.failures.some((failure) => failure.endsWith(':missing')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unexpected exit never becomes an aggregation success', async () => {
  const { root, descriptor } = await createOutputs('stepUp');
  try {
    const validation = validateDerivedScorecardBuilderOutputs({ root, descriptor, targetSha: SHA, repository: REPOSITORY });
    assert.equal(validation.passed, true);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: 2, validation }), false);
    assert.equal(derivedBuilderExitIsAcceptable({ builderExitCode: null, validation }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
