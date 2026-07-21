import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS, validateRuntimeCampaignManifest } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import { SAFE_RUNTIME_LANES } from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

const manifest = JSON.parse(await readFile('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8'));
const script = await readFile('scripts/release/run-enterprise-runtime-campaign.mjs', 'utf8');
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
    for (const inputName of Object.keys(lane.inputs)) assert.match(source, new RegExp(`\\n\\s{6}${inputName}:`));
    assert.ok(source.includes(lane.artifact_prefix));
    assert.match(source, /persist-credentials: false/);
  }
});

test('dispatcher supports full and safe exact-SHA campaigns with bounded trusted artifacts', () => {
  for (const pattern of [
    /resolveRuntimeCampaignProfile/,
    /profileRequiresRecoveryConfirmation/,
    /profileMayReuseExactShaRuns/,
    /selectExactShaRun/,
    /reused_exact_sha/,
    /commits\/main/,
    /startsWith\(artifactPrefix\)/,
    /Required prefixed artifact inventory is invalid/,
    /zipfile\.ZipFile\(io\.BytesIO\(archive\)\)/,
    /stat\.S_ISLNK/,
    /open\(target, 'xb'\)/,
    /READY_FOR_SAFE_PROMOTION/,
  ]) assert.match(script, pattern);
  assert.doesNotMatch(script, /artifact\.archive_download_url/);
});

test('full closeout retains destructive confirmation and safe bootstrap excludes destructive lanes', () => {
  assert.match(closeoutWorkflow, /RUN_ENTERPRISE_RUNTIME_CLOSEOUT/);
  assert.match(closeoutWorkflow, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.match(closeoutWorkflow, /environment: production-enterprise-closeout/);
  assert.match(closeoutWorkflow, /actions: write/);
  assert.doesNotMatch(closeoutWorkflow, /continue-on-error:\s*true/);

  assert.equal(SAFE_RUNTIME_LANES.includes('RECOVERY'), false);
  assert.equal(SAFE_RUNTIME_LANES.includes('ASSURANCE'), false);
  assert.match(safeWorkflow, /workflow_run:/);
  assert.match(safeWorkflow, /workflows: \[Full Security Suite\]/);
  assert.match(safeWorkflow, /RUNTIME_CAMPAIGN_PROFILE: safe/);
  assert.match(safeWorkflow, /SAFE_EVIDENCE_PROMOTED/);
  assert.doesNotMatch(safeWorkflow, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.doesNotMatch(safeWorkflow, /VALIDATE_FINAL_ASSURANCE/);
  assert.doesNotMatch(safeWorkflow, /continue-on-error:\s*true/);
});
