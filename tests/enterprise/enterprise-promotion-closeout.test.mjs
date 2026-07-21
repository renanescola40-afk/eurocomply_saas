import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runPromotionCloseout } from '../../scripts/enterprise/run-enterprise-promotion-closeout.mjs';
import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import { SAFE_RUNTIME_LANES } from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const LANE_CONTROLS = [...new Set(EXPECTED_RUNTIME_LANES.flatMap((lane) => RUNTIME_LANE_CONTRACTS[lane].controlsVerified))];
const SAFE_CONTROLS = [...new Set(SAFE_RUNTIME_LANES.flatMap((lane) => RUNTIME_LANE_CONTRACTS[lane].controlsVerified))];
const COHERENCE_CONTROL = 'REL-10';

function scorecard() {
  const runtime = LANE_CONTROLS.map((id) => ({
    id,
    domain: 'runtime',
    title: id,
    critical: true,
    weight: 1,
    status: 'NOT_VERIFIED',
    earnedWeight: 0,
    evidencePath: `pending/${id}.json`,
    evidenceCheck: null,
    reason: 'evidence_file_missing',
  }));
  const coherence = {
    id: COHERENCE_CONTROL,
    domain: 'release',
    title: 'Final evidence bundle is coherent',
    critical: true,
    weight: 1,
    status: 'BLOCKED',
    earnedWeight: 0,
    evidencePath: 'pending/REL-10.json',
    evidenceCheck: null,
    reason: 'derived_from_document_status',
  };
  const fillers = Array.from({ length: 100 - runtime.length - 1 }, (_, index) => ({
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
    remainingPercent: 100 - fillers.length,
    classification: 'ENTERPRISE_CANDIDATE',
    releaseDecision: 'NO_GO',
    publishRecommendation: 'DO_NOT_PUBLISH',
    criticalOpen: runtime.length + 1,
    criticalFailed: 0,
    counts: { PASS: fillers.length, NOT_VERIFIED: runtime.length, BLOCKED: 1 },
    domains: [],
    controls: [...fillers, ...runtime, coherence],
  };
}

function campaign(profile, lanes) {
  return {
    schema_version: 2,
    profile,
    release_sha: SHA,
    release_branch: 'main',
    decision: profile === 'safe' ? 'READY_FOR_SAFE_PROMOTION' : 'READY_FOR_EVIDENCE_PROMOTION',
    expected_lanes: lanes,
    results: lanes.map((id, index) => {
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
        source: profile === 'safe' ? 'reused_exact_sha' : 'dispatched',
        reason: null,
      };
    }),
  };
}

async function fixture(lanes) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'promotion-contract-'));
  const runtimeRoot = path.join(root, 'runtime');
  const stagingRoot = path.join(root, 'staging');
  for (const [index, lane] of lanes.entries()) {
    const contract = RUNTIME_LANE_CONTRACTS[lane];
    const laneRoot = path.join(runtimeRoot, lane.toLowerCase());
    await mkdir(laneRoot, { recursive: true });
    for (const fileName of contract.requiredEvidenceFiles) {
      await writeFile(path.join(laneRoot, fileName), JSON.stringify({
        schema: `legacy.${lane}`,
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

test('full closeout promotes all lanes and restricts self-promotion to REL-10', async () => {
  const f = await fixture(EXPECTED_RUNTIME_LANES);
  try {
    const result = await runPromotionCloseout({
      campaign: campaign('full', EXPECTED_RUNTIME_LANES),
      scorecard: scorecard(),
      runtimeRoot: f.runtimeRoot,
      stagingRoot: f.stagingRoot,
      targetSha: SHA,
      repository: REPOSITORY,
      workflowRunId: '999',
      profile: 'full',
      generatedAt: '2026-07-21T16:00:00Z',
    });
    assert.equal(result.preliminaryPromotion.score.completePercent, 99);
    assert.equal(result.promotion.score.completePercent, 100);
    assert.equal(result.closeout.coherencePromoted, true);
    assert.equal(result.closeout.releaseDecision, 'GO');
    assert.equal(result.closeout.closeoutDecision, 'GO');
    assert.equal(result.closeout.promotedDeltaPercent, LANE_CONTROLS.length + 1);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('safe closeout promotes only non-destructive lanes and remains NO_GO', async () => {
  const f = await fixture(SAFE_RUNTIME_LANES);
  try {
    const baseline = scorecard();
    const result = await runPromotionCloseout({
      campaign: campaign('safe', SAFE_RUNTIME_LANES),
      scorecard: baseline,
      runtimeRoot: f.runtimeRoot,
      stagingRoot: f.stagingRoot,
      targetSha: SHA,
      repository: REPOSITORY,
      workflowRunId: '998',
      profile: 'safe',
      generatedAt: '2026-07-21T16:00:00Z',
    });
    assert.equal(result.closeout.profile, 'safe');
    assert.equal(result.closeout.coherencePromoted, false);
    assert.equal(result.closeout.closeoutDecision, 'SAFE_EVIDENCE_PROMOTED');
    assert.equal(result.closeout.releaseDecision, 'NO_GO');
    assert.equal(result.closeout.promotedDeltaPercent, SAFE_CONTROLS.length);
    assert.equal(result.promotion.score.completePercent, baseline.scorePercent + SAFE_CONTROLS.length);
    assert.ok(result.closeout.criticalOpen.includes('REC-01'));
    assert.ok(result.closeout.criticalOpen.includes('SEC-10'));
    assert.ok(result.closeout.criticalOpen.includes(COHERENCE_CONTROL));
    assert.equal(result.promotion.controls.find((control) => control.id === COHERENCE_CONTROL).status, 'BLOCKED');
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('full closeout fails closed when recovery evidence is incomplete', async () => {
  const f = await fixture(EXPECTED_RUNTIME_LANES);
  try {
    await rm(path.join(f.runtimeRoot, 'recovery', 'rollback-validation.json'));
    await assert.rejects(runPromotionCloseout({
      campaign: campaign('full', EXPECTED_RUNTIME_LANES),
      scorecard: scorecard(),
      runtimeRoot: f.runtimeRoot,
      stagingRoot: f.stagingRoot,
      targetSha: SHA,
      repository: REPOSITORY,
      workflowRunId: '999',
      profile: 'full',
    }), /required evidence file is missing/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test('safe closeout rejects a campaign that claims a full-profile lane', async () => {
  const f = await fixture(SAFE_RUNTIME_LANES);
  try {
    const invalid = campaign('safe', [...SAFE_RUNTIME_LANES, 'RECOVERY']);
    await assert.rejects(runPromotionCloseout({
      campaign: invalid,
      scorecard: scorecard(),
      runtimeRoot: f.runtimeRoot,
      stagingRoot: f.stagingRoot,
      targetSha: SHA,
      repository: REPOSITORY,
      workflowRunId: '997',
      profile: 'safe',
    }), /must contain all .* safe lanes|outside the safe profile/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
