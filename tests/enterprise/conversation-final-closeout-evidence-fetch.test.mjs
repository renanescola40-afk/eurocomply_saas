import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boundedFailureCode,
  buildRetrievalManifest,
  selectExactArtifact,
  selectExactShaRun,
} from '../../scripts/enterprise/fetch-conversation-final-closeout-evidence.mjs';

const SHA = 'a'.repeat(40);

function completeSource(key, workflow, artifactName, paths) {
  return {
    key,
    workflow,
    artifactName,
    expectedPaths: paths,
    extractedPaths: paths,
    status: 'Complete',
    runId: '123',
    artifactId: '456',
    runEvent: 'workflow_dispatch',
    runUpdatedAt: '2026-08-04T09:00:00.000Z',
    artifactUpdatedAt: '2026-08-04T09:01:00.000Z',
    failure: null,
  };
}

test('selects the newest successful exact-main-SHA trusted workflow run', () => {
  const selected = selectExactShaRun([
    { id: 1, head_sha: SHA, head_branch: 'feature', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T10:00:00Z' },
    { id: 2, head_sha: 'b'.repeat(40), head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T11:00:00Z' },
    { id: 3, head_sha: SHA, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'failure', updated_at: '2026-07-29T12:00:00Z' },
    { id: 4, head_sha: SHA, head_branch: 'main', event: 'pull_request', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T15:00:00Z' },
    { id: 5, head_sha: SHA, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T13:00:00Z' },
    { id: 6, head_sha: SHA, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-07-29T14:00:00Z' },
  ], SHA);

  assert.equal(selected.id, 6);
});

test('rejects expired or differently named artifacts', () => {
  const expected = `enterprise-readiness-scorecard-${SHA}`;
  assert.equal(selectExactArtifact([
    { id: 1, name: expected, expired: true, updated_at: '2026-07-29T14:00:00Z' },
    { id: 2, name: `enterprise-readiness-scorecard-${'b'.repeat(40)}`, expired: false, updated_at: '2026-07-29T15:00:00Z' },
  ], expected), null);
});

test('selects the newest retained exact-name artifact', () => {
  const expected = `enterprise-production-final-evidence-${SHA}`;
  const selected = selectExactArtifact([
    { id: 1, name: expected, expired: false, updated_at: '2026-07-29T13:00:00Z' },
    { id: 2, name: expected, expired: false, updated_at: '2026-07-29T14:00:00Z' },
  ], expected);

  assert.equal(selected.id, 2);
});

test('bounds failure codes before they enter retained evidence', () => {
  assert.equal(boundedFailureCode(new Error('github_api_403: raw provider details')), 'github_api_403');
  assert.equal(boundedFailureCode(new Error('../../unsafe value')), 'unknown_error');
  assert.equal(boundedFailureCode('network token value'), 'unknown_error');
});

test('builds Complete retrieval provenance only when every canonical source completes', () => {
  const productionPaths = [
    'docs/security/evidence/runtime/stripe-billing-validation.json',
    'docs/security/evidence/runtime/enterprise-runtime-evidence.json',
    'docs/security/evidence/runtime/production-final-validation.json',
    'docs/security/evidence/runtime/release-go-no-go.json',
  ];
  const scorecardPaths = [
    'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json',
    'artifacts/enterprise-readiness/persistent-execution-state.json',
  ];
  const manifest = buildRetrievalManifest({
    targetSha: SHA,
    generatedAt: '2026-08-04T09:02:00.000Z',
    sources: [
      completeSource('enterpriseProductionFinal', 'enterprise-production-gate.yml', `enterprise-production-final-evidence-${SHA}`, productionPaths),
      completeSource('enterpriseReadinessScorecard', 'enterprise-readiness-scorecard.yml', `enterprise-readiness-scorecard-${SHA}`, scorecardPaths),
    ],
  });

  assert.equal(manifest.status, 'Complete');
  assert.equal(manifest.outcome, 'passed');
  assert.deepEqual(manifest.blockers, []);
  assert.equal(manifest.noSecretsStored, true);
});

test('keeps retrieval Open and preserves a bounded blocker when evidence is missing', () => {
  const manifest = buildRetrievalManifest({
    targetSha: SHA,
    sources: [{
      key: 'enterpriseProductionFinal',
      workflow: 'enterprise-production-gate.yml',
      status: 'Open',
      failure: 'exact_sha_artifact_missing',
    }],
  });

  assert.equal(manifest.status, 'Open');
  assert.equal(manifest.outcome, 'blocked');
  assert.deepEqual(manifest.blockers, [{
    key: 'enterpriseProductionFinal',
    workflow: 'enterprise-production-gate.yml',
    failure: 'exact_sha_artifact_missing',
  }]);
});
