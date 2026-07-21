import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildFinalCoherenceEvidence, runPromotionCloseout } from '../../scripts/enterprise/run-enterprise-promotion-closeout.mjs';
import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS } from '../../scripts/enterprise/runtime-lane-contracts.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const RUNTIME_CONTROLS = [...new Set(EXPECTED_RUNTIME_LANES.flatMap((lane) => RUNTIME_LANE_CONTRACTS[lane].controlsVerified))];

function scorecard() {
  const openIds = [...RUNTIME_CONTROLS, 'REL-10'];
  const open = openIds.map((id) => ({
    id,
    domain: 'closeout',
    title: id,
    critical: true,
    weight: 1,
    status: 'NOT_VERIFIED',
    earnedWeight: 0,
    evidencePath: `pending/${id}.json`,
    evidenceCheck: null,
    reason: 'evidence_file_missing',
  }));
  const fillers = Array.from({ length: 100 - open.length }, (_, index) => ({
    id: `BASE-${String(index + 1).padStart(3, '0')}`,
    domain: 'baseline',
    title: `Base ${index + 1}`,
    critical: false,
    weight: 1,
    status: 'PASS',
    earnedWeight: 1,
    evidencePath: `accepted/base-${index + 1}.json`,
    evidenceCheck: null,
    reason: 'derived_from_exact_sha_check:requiredChecks',
  }));
  return {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    scorePercent: fillers.length,
    scoreOutOfTen: fillers.length / 10,
    completedPercent: fillers.length,
    remainingPercent: open.length,
    classification: 'ENTERPRISE_CANDIDATE',
    releaseDecision: 'NO_GO',
    publishRecommendation: 'DO_NOT_PUBLISH',
    criticalOpen: open.length,
    criticalFailed: 0,
    counts: { PASS: fillers.length, NOT_VERIFIED: open.length },
    domains: [],
    controls: [...fillers, ...open],
  };
}

function campaign() {
  return {
    schema_version: 2,
    release_sha: SHA,
    release_branch: 'main',
    decision: 'READY_FOR_EVIDENCE_PROMOTION',
    results: EXPECTED_RUNTIME_LANES.map((id, index) => {
      const contract = RUNTIME_LANE_CONTRACTS[id];
      return {
        id,
        workflow: contract.workflow,
        required: true,
        status: 'complete',
        conclusion: 'success',
        run_id: 1000 + index,
        artifact_count: 1,
        artifact_names: [`${contract.artifactPrefix}${SHA}`],
        reason: null,
      };
    }),
  };
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-eleven-closeout-'));
  const runtimeRoot = path.join(root, 'runtime');
  const stagingRoot = path.join(root, 'staging');
  for (const [index, lane] of EXPECTED_RUNTIME_LANES.entries()) {
    const contract = RUNTIME_LANE_CONTRACTS[lane];
    const laneRoot = path.join(runtimeRoot, lane.toLowerCase());
    await mkdir(laneRoot, { recursive: true });
    for (const fileName of contract.requiredEvidenceFiles) {
      await writeFile(path.join(laneRoot, fileName), JSON.stringify({
        schema: `fixture.${lane}`,
        status: 'Complete',
        outcome: 'passed',
        generatedAt: '2026-07-21T15:00:00Z',
        repository: REPOSITORY,
        targetSha: SHA,
        workflowRunId: String(1000 + index),
        evidenceIntegrity: { credentialsStored: false },
      }));
    }
  }
  return { root, runtimeRoot, stagingRoot };
}

test('promotes the final coherence control only after the other 99 controls pass', async () => {
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
      generatedAt: '2026-07-21T16:00:00Z',
    });
    assert.equal(result.preliminaryPromotion.score.completePercent, 99);
    assert.deepEqual(result.preliminaryPromotion.criticalOpen, ['REL-10']);
    assert.equal(result.coherenceEvidence.controlsVerified[0], 'REL-10');
    assert.equal(result.promotion.score.completePercent, 100);
    assert.equal(result.closeout.coherencePromoted, true);
    assert.equal(result.closeout.releaseDecision, 'GO');
  } finally {
    await rm(setup.root, { recursive: true, force: true });
  }
});

test('does not generate coherence evidence while another control is open', () => {
  const controls = Array.from({ length: 100 }, (_, index) => ({
    id: index === 98 ? 'SEC-10' : index === 99 ? 'REL-10' : `PASS-${index}`,
    status: index >= 98 ? 'NOT_VERIFIED' : 'PASS',
  }));
  const evidence = buildFinalCoherenceEvidence({
    preliminaryPromotion: {
      controls,
      score: { completePercent: 98, remainingPercent: 2 },
      rejectedEvidence: [],
      integrity: { sha256: 'b'.repeat(64) },
    },
    targetSha: SHA,
    repository: REPOSITORY,
    workflowRunId: '999',
    generatedAt: '2026-07-21T16:00:00Z',
  });
  assert.equal(evidence, null);
});
