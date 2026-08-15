import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');

const STALE_SHA_GUARD = 'github.event.workflow_run.head_sha == github.sha';
const DYNAMIC_JOB_NAME = "name: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha != github.sha && 'Stale P0 runtime evidence trigger (ignored)' || 'Validate P0 runtime evidence register' }}";
const ASSESSED_SHA_BINDING = 'ASSESSED_SHA: ${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}';

function jobBlock() {
  const start = workflow.indexOf('  p0-runtime-evidence:');
  const end = workflow.indexOf('\n    steps:', start);
  assert.notEqual(start, -1, 'P0 runtime evidence job must exist');
  assert.notEqual(end, -1, 'P0 runtime evidence job steps must exist');
  return { start, end, block: workflow.slice(start, end) };
}

test('stale workflow_run producers are skipped before authoritative P0 execution under a non-authoritative check name', () => {
  const { block } = jobBlock();

  assert.ok(block.includes(STALE_SHA_GUARD), 'P0 job must reject workflow_run producers whose head SHA is not the current workflow SHA');
  assert.ok(block.includes(DYNAMIC_JOB_NAME), 'stale workflow_run must use a non-authoritative check name');
  assert.match(block, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(block, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.equal((workflow.match(/Stale P0 runtime evidence trigger \(ignored\)/g) ?? []).length, 1);
});

test('current-SHA P0 retains the authoritative required-check name and exact assessed-SHA binding', () => {
  assert.ok(workflow.includes(DYNAMIC_JOB_NAME));
  assert.ok(workflow.includes(ASSESSED_SHA_BINDING));
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$ASSESSED_SHA"/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('the stale-trigger guard is part of the canonical P0 contract suite', () => {
  assert.match(
    workflow,
    /node --test[\s\S]*tests\/security\/p0-runtime-stale-workflow-run-guard\.test\.mjs/,
  );
});
