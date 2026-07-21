import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS, validateRuntimeCampaignManifest } from '../../scripts/enterprise/runtime-lane-contracts.mjs';
const manifest = JSON.parse(await readFile('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8'));
const script = await readFile('scripts/release/run-enterprise-runtime-campaign.mjs', 'utf8');
const workflow = await readFile('.github/workflows/enterprise-runtime-closeout.yml', 'utf8');
test('campaign defines ten exact manifest-driven lanes', async () => {
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
test('dispatcher uses lane inputs, exact main and bounded trusted artifacts', () => {
  for (const pattern of [/resolveLaneInputs\(lane\.inputs/, /RECOVERY_ROLLBACK_CONFIRMATION must explicitly authorize/, /commits\/main/, /startsWith\(artifactPrefix\)/, /Required prefixed artifact inventory is invalid/, /zipfile\.ZipFile\(io\.BytesIO\(archive\)\)/, /stat\.S_ISLNK/, /open\(target, 'xb'\)/, /READY_FOR_EVIDENCE_PROMOTION/]) assert.match(script, pattern);
  assert.doesNotMatch(script, /artifact\.archive_download_url/);
});
test('parent closeout requires both operator confirmations and remains fail closed', () => {
  assert.match(workflow, /RUN_ENTERPRISE_RUNTIME_CLOSEOUT/);
  assert.match(workflow, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.match(workflow, /environment: production-enterprise-closeout/);
  assert.match(workflow, /actions: write/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
