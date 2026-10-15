import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/p0-progress.yml', 'utf8');
const header = workflow.split('\njobs:')[0];
const expectedGroup = 'p0-progress-' +
  '${{ github.event_name }}-${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}';

test('coalesces repeated workflow_run triggers for the same assessed commit', () => {
  assert.ok(header.includes('group: ' + expectedGroup));
  assert.ok(!header.includes('github.event.workflow_run.id || github.event.pull_request.head.sha'));
});

test('does not terminate an in-flight authoritative assessment', () => {
  assert.match(header, /cancel-in-progress: false/);
});

test('retains all required trigger categories', () => {
  assert.match(header, /workflow_dispatch:/);
  assert.match(header, /pull_request:/);
  assert.match(header, /push:/);
  assert.match(header, /workflow_run:/);
});
