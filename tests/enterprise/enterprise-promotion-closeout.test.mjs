import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildScorecardBaselineEvidence } from '../../scripts/enterprise/build-scorecard-baseline-evidence.mjs';
import { runPromotionCloseout } from '../../scripts/enterprise/run-enterprise-promotion-closeout.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const LANES = ['IAM-RBAC', 'IAM-LIFECYCLE', 'TEN-RLS', 'PLATFORM', 'DATA', 'INCIDENT', 'TRUST', 'RECOVERY', 'PRODUCTION', 'STEP-UP'];

function scorecard(passCount = 46) {
  const controls = Array.from({ length: 100 }, (_, index) => {
    const id = `CTRL-${String(index + 1).padStart(3, '0')}`;
    const passed = index < passCount;
    return {
      id,
      domain: 'test',
      title: `Control ${index + 1}`,
      critical: index < 20,
      weight: 1,
      status: passed ? 'PASS' : 'NOT_VERIFIED',
      earnedWeight: passed ? 1 : 0,
      evidencePath: passed ? `artifacts/evidence/${id}.json` : `docs/security/evidence/pending/${id}.json`,
      evidenceCheck: null,
      reason: passed ? 'derived_from_exact_sha_check:requiredChecks' : 'evidence_file_missing',
    };
  });
  return {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    scorePercent: passCount,
    scoreOutOfTen: passCount / 10,
    completedPercent: passCount,
    remainingPercent: 100 - passCount,
    classification: 'MVP',
    releaseDecision: passCount === 100 ? 'GO' : 'NO_GO',
    publishRecommendation: passCount === 100 ? 'ENTERPRISE_PRODUCTION' : 'DO_NOT_PUBLISH',
    criticalOpen: controls.filter((control) => control.critical && control.status !== 'PASS').length,
    criticalFailed: 0,
    counts: { PASS: passCount, NOT_VERIFIED: 100 - passCount },
    domains: [],
    controls,
  };
}

function campaign() {
  return {
    schema_version: 1,
    release_sha: SHA,
    release_branch: 'main',
    decision: 'READY_FOR_EVIDENCE_PROMOTION',
    results: LANES.map((id, index) => ({
      id,
      workflow: `${id.toLowerCase()}.yml`,
      required: true,
      status: 'complete',
      conclusion: 'success',
      run_id: 1000 + index,
      artifact_count: 1,
      reason: null,
    })),
  };
}

async function fixture({ sensitiveLane = null } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'enterprise-promotion-'));
  const runtimeRoot = path.join(root, 'runtime');
  const stagingRoot = path.join(root, 'staging');
  const remaining = scorecard().controls.slice(46);
  let offset = 0;

  for (const [index, lane] of LANES.entries()) {
    const laneRoot = path.join(runtimeRoot, lane.toLowerCase());
    await mkdir(laneRoot, { recursive: true });
    const count = index < 4 ? 6 : 5;
    const controlsVerified = remaining.slice(offset, offset + count).map((control) => control.id);
    offset += count;
    const document = {
      schema: `risck-comply.${lane.toLowerCase()}.evidence.v1`,
      evidenceItem: `${lane.toLowerCase()}-runtime-proof`,
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-07-21T15:00:00.000Z',
      repository: REPOSITORY,
      targetSha: SHA,
      observedSha: SHA,
      runId: String(1000 + index),
      controlsVerified,
      evidenceIntegrity: { containsSensitiveValues: false },
      ...(sensitiveLane === lane ? { token: 'must-never-enter-the-manifest' } : {}),
    };
    await writeFile(path.join(laneRoot, 'evidence.json'), `${JSON.stringify(document, null, 2)}\n`);
  }

  return { root, runtimeRoot, stagingRoot };
}

test('builds exact-SHA baseline evidence only from canonical PASS controls', () => {
  const evidence = buildScorecardBaselineEvidence({
    scorecard: scorecard(),
    targetSha: SHA,
    repository: REPOSITORY,
    runId: '999',
    generatedAt: '2026-07-21T15:00:00.000Z',
  });
  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.controlsVerified.length, 46);
  assert.equal(evidence.baseline.completedPercent, 46);
  assert.equal(evidence.baseline.remainingPercent, 54);
  assert.match(evidence.sourceDigests.scorecardSha256, /^[a-f0-9]{64}$/);
});

test('promotes baseline and all ten runtime lanes to an evidence-backed GO', async () => {
  const setup = await fixture();
  try {
    const result = await runPromotionCloseout({
      campaign: campaign(),
      scorecard: scorecard(),
      runtimeRoot: setup.runtimeRoot,
      stagingRoot: setup.stagingRoot,
      targetSha: SHA,
      repository: REPOSITORY,
      workflowRunId: '999',
      generatedAt: '2026-07-21T15:00:00.000Z',
    });
    assert.equal(result.manifest.summary.decision, 'READY_FOR_PROMOTION');
    assert.equal(result.promotion.score.completePercent, 100);
    assert.equal(result.promotion.score.remainingPercent, 0);
    assert.equal(result.closeout.promotedDeltaPercent, 54);
    assert.equal(result.closeout.releaseDecision, 'GO');
    assert.equal(result.closeout.criticalOpen.length, 0);
    assert.equal(Object.keys(result.closeout.laneEvidenceCounts).length, 10);
  } finally {
    await rm(setup.root, { recursive: true, force: true });
  }
});

test('fails closed when a required runtime lane has no scorecard-readable evidence', async () => {
  const setup = await fixture();
  try {
    await rm(path.join(setup.runtimeRoot, 'recovery'), { recursive: true, force: true });
    await assert.rejects(
      runPromotionCloseout({
        campaign: campaign(),
        scorecard: scorecard(),
        runtimeRoot: setup.runtimeRoot,
        stagingRoot: setup.stagingRoot,
        targetSha: SHA,
        repository: REPOSITORY,
        workflowRunId: '999',
      }),
      /runtime lane RECOVERY artifact directory is missing/,
    );
  } finally {
    await rm(setup.root, { recursive: true, force: true });
  }
});

test('fails closed on secret-shaped runtime evidence metadata', async () => {
  const setup = await fixture({ sensitiveLane: 'PLATFORM' });
  try {
    await assert.rejects(
      runPromotionCloseout({
        campaign: campaign(),
        scorecard: scorecard(),
        runtimeRoot: setup.runtimeRoot,
        stagingRoot: setup.stagingRoot,
        targetSha: SHA,
        repository: REPOSITORY,
        workflowRunId: '999',
      }),
      /PLATFORM contains secret-shaped evidence metadata/,
    );
  } finally {
    await rm(setup.root, { recursive: true, force: true });
  }
});

test('fails closed when campaign provenance does not match the release SHA', async () => {
  const setup = await fixture();
  try {
    await assert.rejects(
      runPromotionCloseout({
        campaign: { ...campaign(), release_sha: 'b'.repeat(40) },
        scorecard: scorecard(),
        runtimeRoot: setup.runtimeRoot,
        stagingRoot: setup.stagingRoot,
        targetSha: SHA,
        repository: REPOSITORY,
        workflowRunId: '999',
      }),
      /runtime campaign exact-SHA provenance mismatch/,
    );
  } finally {
    await rm(setup.root, { recursive: true, force: true });
  }
});
