import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeLaneEvidence } from '../../scripts/enterprise/runtime-lane-evidence-normalizer.mjs';
import { RUNTIME_LANE_CONTRACTS } from '../../scripts/enterprise/runtime-lane-contracts.mjs';

const SHA = 'c'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

async function setup(lane, mutate = (doc) => doc) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lane-normalizer-'));
  const dir = path.join(root, lane.toLowerCase());
  await mkdir(dir, { recursive: true });

  for (const fileName of RUNTIME_LANE_CONTRACTS[lane].requiredEvidenceFiles) {
    const doc = mutate({
      schema: `legacy.${lane}`,
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-07-21T15:00:00Z',
      targetSha: SHA,
      workflowRunId: '4242',
      evidenceIntegrity: { credentialsStored: false },
    }, fileName);
    await writeFile(path.join(dir, fileName), JSON.stringify(doc));
  }

  return root;
}

test('static contract owns controlsVerified', async () => {
  const root = await setup('IAM-LIFECYCLE', (document) => ({
    ...document,
    controlsVerified: ['UNKNOWN'],
  }));
  try {
    const evidence = await normalizeLaneEvidence({
      runtimeRoot: root,
      lane: 'IAM-LIFECYCLE',
      campaignResult: { run_id: 4242 },
      targetSha: SHA,
      repository: REPOSITORY,
    });
    assert.deepEqual(evidence.controlsVerified, [...RUNTIME_LANE_CONTRACTS['IAM-LIFECYCLE'].controlsVerified]);
    assert.equal(evidence.evidenceIntegrity.containsSensitiveValues, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recovery requires both canonical source files', async () => {
  const root = await setup('RECOVERY');
  try {
    await rm(path.join(root, 'recovery', 'rollback-validation.json'));
    await assert.rejects(normalizeLaneEvidence({
      runtimeRoot: root,
      lane: 'RECOVERY',
      campaignResult: { run_id: 4242 },
      targetSha: SHA,
      repository: REPOSITORY,
    }), /rollback-validation\.json/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('mismatched child run is rejected', async () => {
  const root = await setup('DATA', (document) => ({ ...document, workflowRunId: '999' }));
  try {
    await assert.rejects(normalizeLaneEvidence({
      runtimeRoot: root,
      lane: 'DATA',
      campaignResult: { run_id: 4242 },
      targetSha: SHA,
      repository: REPOSITORY,
    }), /run ID mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('repository status-check label maps do not look like credentials', async () => {
  const root = await setup('REPOSITORY', (document) => ({
    ...document,
    accepted_status_check_aliases: {
      'Secret scanning (Gitleaks)': ['Secret scanning (Gitleaks)'],
      'Secret Scanning / Production secret readiness gate': ['Production secret readiness gate'],
    },
    sourceDetails: {
      matchedRequiredChecks: {
        'Gitleaks / Scan repository for accidental secret exposure': [
          'Scan repository for accidental secret exposure',
        ],
      },
    },
  }));

  try {
    const evidence = await normalizeLaneEvidence({
      runtimeRoot: root,
      lane: 'REPOSITORY',
      campaignResult: { run_id: 4242 },
      targetSha: SHA,
      repository: REPOSITORY,
    });
    assert.equal(evidence.status, 'Complete');
    assert.equal(evidence.outcome, 'passed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('actual sensitive metadata still fails closed', async () => {
  const root = await setup('REPOSITORY', (document) => ({
    ...document,
    authorization: 'Bearer should-be-rejected',
  }));

  try {
    await assert.rejects(normalizeLaneEvidence({
      runtimeRoot: root,
      lane: 'REPOSITORY',
      campaignResult: { run_id: 4242 },
      targetSha: SHA,
      repository: REPOSITORY,
    }), /secret-shaped/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
