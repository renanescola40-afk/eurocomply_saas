import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8'));
const script = await readFile('scripts/release/run-enterprise-runtime-campaign.mjs', 'utf8');
const workflow = await readFile('.github/workflows/enterprise-runtime-closeout.yml', 'utf8');

test('campaign consolidates ten required protected runtime lanes', () => {
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.workflows.length, 10);
  assert.equal(new Set(manifest.workflows.map((lane) => lane.id)).size, 10);
  assert.ok(manifest.workflows.every((lane) => lane.required === true));
  assert.ok(manifest.workflows.every((lane) => lane.workflow.endsWith('.yml')));
  assert.ok(manifest.workflows.every((lane) => lane.artifact_prefix.length > 5));
});

test('campaign is exact-main and fail-closed', () => {
  assert.match(script, /RELEASE_SHA must be a lowercase full 40-character SHA/);
  assert.match(script, /restricted to main/);
  assert.match(script, /commits\/main/);
  assert.match(script, /missing_artifact/);
  assert.match(script, /READY_FOR_EVIDENCE_PROMOTION/);
  assert.match(script, /process\.exitCode = 1/);
  assert.doesNotMatch(script, /console\.log\(token\)/);
});

test('workflow requires protected operator confirmation', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /RUN_ENTERPRISE_RUNTIME_CLOSEOUT/);
  assert.match(workflow, /environment: production-enterprise-closeout/);
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /Enforce fail-closed closeout/);
});

test('campaign never marks an unsuccessful or artifact-free lane complete', () => {
  assert.match(script, /run\.conclusion === 'success' \? 'complete' : 'blocked'/);
  assert.match(script, /artifacts\.length === 0/);
  assert.match(script, /required\.every\(\(result\) => result\.status === 'complete'\)/);
});
