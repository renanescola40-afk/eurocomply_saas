import assert from 'node:assert/strict';
import test from 'node:test';

import { selectExactShaRun } from '../../scripts/enterprise/runtime-campaign-run-selection.mjs';

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const base = {
  head_sha: SHA,
  head_branch: 'main',
  event: 'workflow_dispatch',
  status: 'completed',
  conclusion: 'success',
};

test('safe selection reuses the newest exact-main push or dispatch run', () => {
  const run = selectExactShaRun([
    { ...base, id: 1, event: 'push', created_at: '2026-07-21T10:00:00Z' },
    { ...base, id: 2, event: 'workflow_dispatch', created_at: '2026-07-21T11:00:00Z' },
    { ...base, id: 3, head_sha: OTHER_SHA, created_at: '2026-07-21T12:00:00Z' },
  ], { releaseSha: SHA, allowExisting: true });
  assert.equal(run.id, 2);
});

test('fresh dispatch selection ignores old failed exact-SHA runs', () => {
  const notBefore = Date.parse('2026-07-21T11:30:00Z');
  const run = selectExactShaRun([
    { ...base, id: 4, conclusion: 'failure', created_at: '2026-07-21T11:00:00Z' },
    { ...base, id: 5, status: 'queued', conclusion: null, created_at: '2026-07-21T11:30:02Z' },
  ], { releaseSha: SHA, notBefore, allowExisting: false });
  assert.equal(run.id, 5);
});

test('selection rejects non-main and unsupported events', () => {
  const run = selectExactShaRun([
    { ...base, id: 6, head_branch: 'feature', created_at: '2026-07-21T12:00:00Z' },
    { ...base, id: 7, event: 'pull_request', created_at: '2026-07-21T12:01:00Z' },
  ], { releaseSha: SHA, allowExisting: true });
  assert.equal(run, null);
});

test('selection validates its provenance inputs', () => {
  assert.throws(() => selectExactShaRun([], { releaseSha: 'short' }), /releaseSha/);
  assert.throws(() => selectExactShaRun([], { releaseSha: SHA, notBefore: -1 }), /notBefore/);
});
