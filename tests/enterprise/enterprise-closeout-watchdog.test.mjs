import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCloseoutWatchdogReport,
  classifyWorkflowEvidence,
  FULL_ORCHESTRATOR_EVENTS,
  LANE_EVENTS,
  SAFE_ORCHESTRATOR_EVENTS,
  selectLatestExactShaRun,
} from '../../scripts/enterprise/closeout-watchdog-core.mjs';
import {
  EXPECTED_RUNTIME_LANES,
} from '../../scripts/enterprise/runtime-lane-contracts.mjs';
import {
  SAFE_RUNTIME_LANES,
} from '../../scripts/enterprise/runtime-campaign-profiles.mjs';

const sha = 'a'.repeat(40);
const now = '2026-07-21T20:00:00.000Z';

function run(overrides = {}) {
  return {
    id: 42,
    head_sha: sha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function artifact(name = 'proof-a') {
  return { id: 9, name, expired: false, size_in_bytes: 1024 };
}

function evidence(id, state = 'complete') {
  return {
    id,
    workflow: `${id.toLowerCase()}.yml`,
    required: true,
    state,
    reason: state === 'complete' ? null : 'no_exact_sha_run',
    run_id: state === 'missing' ? null : 1,
    run_status: state === 'running' ? 'in_progress' : 'completed',
    conclusion: state === 'complete' ? 'success' : null,
    event: 'workflow_dispatch',
    created_at: now,
    updated_at: now,
    artifact_names: state === 'complete' ? [`${id.toLowerCase()}-proof`] : [],
  };
}

const safeIds = [...SAFE_RUNTIME_LANES];
const allIds = [...EXPECTED_RUNTIME_LANES];

test('selects only the newest exact-SHA main run from allowlisted events', () => {
  const selected = selectLatestExactShaRun([
    run({ id: 1, event: 'pull_request', created_at: '2026-07-21T20:03:00.000Z' }),
    run({ id: 2, head_sha: 'b'.repeat(40), created_at: '2026-07-21T20:04:00.000Z' }),
    run({ id: 3, head_branch: 'feature', created_at: '2026-07-21T20:05:00.000Z' }),
    run({ id: 4, event: 'push', created_at: '2026-07-21T20:01:00.000Z' }),
    run({ id: 5, event: 'workflow_dispatch', created_at: '2026-07-21T20:02:00.000Z' }),
  ], { releaseSha: sha, allowedEvents: LANE_EVENTS });
  assert.equal(selected.id, 5);
});

test('classifies a successful exact-SHA run only when its retained artifact exists', () => {
  const complete = classifyWorkflowEvidence({
    id: 'IAM-RBAC',
    workflow: 'auth-rbac-runtime-proof.yml',
    run: run(),
    artifacts: [artifact('auth-rbac-runtime-proof-a')],
    artifactPrefix: 'auth-rbac-runtime-proof-',
  });
  assert.equal(complete.state, 'complete');
  assert.deepEqual(complete.artifact_names, ['auth-rbac-runtime-proof-a']);

  const blocked = classifyWorkflowEvidence({
    id: 'IAM-RBAC',
    workflow: 'auth-rbac-runtime-proof.yml',
    run: run(),
    artifacts: [artifact('unrelated-proof')],
    artifactPrefix: 'auth-rbac-runtime-proof-',
  });
  assert.equal(blocked.state, 'blocked');
  assert.equal(blocked.reason, 'missing_retained_artifact');
});

test('distinguishes active, failed and missing workflows without copying raw payloads', () => {
  const active = classifyWorkflowEvidence({
    id: 'DATA', workflow: 'data.yml', run: run({ status: 'in_progress', conclusion: null }), artifacts: [], artifactPrefix: 'data-proof-',
  });
  assert.equal(active.state, 'running');

  const failed = classifyWorkflowEvidence({
    id: 'DATA', workflow: 'data.yml', run: run({ conclusion: 'failure' }), artifacts: [], artifactPrefix: 'data-proof-',
  });
  assert.equal(failed.state, 'failed');
  assert.equal(failed.reason, 'workflow_failure');

  const missing = classifyWorkflowEvidence({
    id: 'DATA', workflow: 'data.yml', run: null, artifacts: [], artifactPrefix: 'data-proof-',
  });
  assert.equal(missing.state, 'missing');
  assert.equal(missing.run_id, null);
});

test('reports retained safe evidence without claiming a score or GO', () => {
  const lanes = allIds.map((id) => evidence(id, safeIds.includes(id) ? 'complete' : 'missing'));
  const report = buildCloseoutWatchdogReport({
    releaseSha: sha,
    lanes,
    orchestrators: [evidence('SAFE-BOOTSTRAP'), evidence('FULL-CLOSEOUT', 'missing')],
    safeLaneIds: safeIds,
    generatedAt: now,
  });
  assert.equal(report.decision, 'SAFE_EVIDENCE_RETAINED');
  assert.equal(report.safe_evidence_retained, true);
  assert.equal(report.full_evidence_retained, false);
  assert.equal(report.score_claim.official_completion_percent, null);
  assert.deepEqual(report.protected_boundaries.map((entry) => entry.id), ['TEN-RLS', 'RECOVERY', 'ASSURANCE']);
});

test('requires every canonical lane, including SCIM, and the protected full closeout before reporting retained GO evidence', () => {
  assert.ok(allIds.includes('IAM-SCIM'));
  assert.ok(safeIds.includes('IAM-SCIM'));
  const report = buildCloseoutWatchdogReport({
    releaseSha: sha,
    lanes: allIds.map((id) => evidence(id)),
    orchestrators: [evidence('SAFE-BOOTSTRAP'), evidence('FULL-CLOSEOUT')],
    safeLaneIds: safeIds,
    generatedAt: now,
  });
  assert.equal(report.decision, 'GO_EVIDENCE_RETAINED');
  assert.equal(report.full_evidence_retained, true);
});

test('never accepts unsupported orchestrator events as exact-SHA evidence', () => {
  const safeRun = selectLatestExactShaRun([run({ event: 'workflow_run' })], { releaseSha: sha, allowedEvents: SAFE_ORCHESTRATOR_EVENTS });
  assert.equal(safeRun.id, 42);
  const fullRun = selectLatestExactShaRun([run({ event: 'workflow_run' })], { releaseSha: sha, allowedEvents: FULL_ORCHESTRATOR_EVENTS });
  assert.equal(fullRun, null);
});
