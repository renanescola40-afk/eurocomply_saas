import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS, validateRuntimeCampaignManifest } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import {
  PARTIAL_SAFE_PROMOTION_DECISION,
  SAFE_RUNTIME_LANES,
} from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

const manifest = JSON.parse(await readFile('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8'));
const script = await readFile('scripts/release/run-enterprise-runtime-campaign.mjs', 'utf8');
const promoter = await readFile('scripts/enterprise/run-enterprise-promotion-closeout.mjs', 'utf8');
const closeoutWorkflow = await readFile('.github/workflows/enterprise-runtime-closeout.yml', 'utf8');
const safeWorkflow = await readFile('.github/workflows/enterprise-safe-runtime-bootstrap.yml', 'utf8');

test('campaign defines the complete exact manifest-driven lane registry', async () => {
  assert.equal(manifest.schema_version, 2);
  assert.deepEqual(manifest.workflows.map((lane) => lane.id), EXPECTED_RUNTIME_LANES);
  assert.equal(validateRuntimeCampaignManifest(manifest), true);
  for (const lane of manifest.workflows) {
    const contract = RUNTIME_LANE_CONTRACTS[lane.id];
    assert.equal(lane.workflow, contract.workflow);
    assert.equal(lane.artifact_prefix, contract.artifactPrefix);
    const source = await readFile(`.github/workflows/${lane.workflow}`, 'utf8');
    for (const inputName of Object.keys(lane.inputs)) assert.match(source, new RegExp(`\n\\s{6}${inputName}:`));
    assert.ok(source.includes(lane.artifact_prefix));
    assert.match(source, /persist-credentials: false/);
  }
});

test('dispatcher supports concurrent safe exact-SHA campaigns with bounded trusted artifacts', () => {
  for (const pattern of [
    /resolveRuntimeCampaignProfile/,
    /profileRequiresRecoveryConfirmation/,
    /profileMayReuseExactShaRuns/,
    /profileAllowsIncrementalPromotion/,
    /decisionForCampaignResults/,
    /selectExactShaRun/,
    /reused_exact_sha/,
    /commits\/main/,
    /startsWith\(artifactPrefix\)/,
    /Required prefixed artifact inventory is invalid/,
    /zipfile\.ZipFile\(io\.BytesIO\(archive\)\)/,
    /stat\.S_ISLNK/,
    /open\(target, 'xb'\)/,
    /Promise\.all\(prepared\.map/,
  ]) assert.match(script, pattern);
  assert.doesNotMatch(script, /artifact\.archive_download_url/);
  assert.match(promoter, new RegExp(PARTIAL_SAFE_PROMOTION_DECISION));
  assert.match(promoter, /PARTIAL_SAFE_EVIDENCE_PROMOTED/);
  assert.match(promoter, /promotableLanes/);
  assert.match(promoter, /blockedLanes/);
});

test('full closeout retains destructive confirmation and remains all-or-nothing', () => {
  assert.match(closeoutWorkflow, /RUN_ENTERPRISE_RUNTIME_CLOSEOUT/);
  assert.match(closeoutWorkflow, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.match(closeoutWorkflow, /environment: production-enterprise-closeout/);
  assert.match(closeoutWorkflow, /actions: write/);
  assert.doesNotMatch(closeoutWorkflow, /continue-on-error:\s*true/);
  assert.doesNotMatch(closeoutWorkflow, /PARTIAL_SAFE_EVIDENCE_PROMOTED/);

  assert.match(promoter, /resolvedProfile === FULL_RUNTIME_PROFILE/);
  assert.match(promoter, /if \(!incremental\) fail\(`runtime lane \$\{result\.id\} is not complete\/success`\)/);
});

test('safe bootstrap excludes destructive lanes and accepts only truthful complete or partial promotion', () => {
  assert.equal(SAFE_RUNTIME_LANES.includes('RECOVERY'), false);
  assert.equal(SAFE_RUNTIME_LANES.includes('ASSURANCE'), false);
  assert.match(safeWorkflow, /workflow_run:/);
  assert.match(safeWorkflow, /workflows: \[Full Security Suite\]/);
  assert.match(safeWorkflow, /RUNTIME_CAMPAIGN_PROFILE: safe/);
  assert.match(safeWorkflow, /READY_FOR_PARTIAL_SAFE_PROMOTION/);
  assert.match(safeWorkflow, /PARTIAL_SAFE_EVIDENCE_PROMOTED/);
  assert.match(safeWorkflow, /promotedLaneCount/);
  assert.match(safeWorkflow, /blockedLaneCount/);
  assert.doesNotMatch(safeWorkflow, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.doesNotMatch(safeWorkflow, /VALIDATE_FINAL_ASSURANCE/);
  assert.doesNotMatch(safeWorkflow, /continue-on-error:\s*true/);
});
