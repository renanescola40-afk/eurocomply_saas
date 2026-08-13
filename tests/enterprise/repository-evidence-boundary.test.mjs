import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REPOSITORY_EVIDENCE_CHECK_NAMES,
  evaluateRepositoryCheckBoundary,
} from '../../scripts/enterprise/repository-evidence-boundary.mjs';
import { buildRepositoryDerivedCompatibilityView } from '../../scripts/enterprise/run-derived-scorecard-evidence-builder.mjs';

const SHA = 'a'.repeat(40);

function checksFixture({ missing = null, source = 'github-actions-api', targetSha = SHA } = {}) {
  return {
    schema: 'risck-comply.github-checks-evidence.v1',
    status: 'Open',
    outcome: 'not_verified',
    generatedFromRealEvidence: true,
    source,
    targetSha,
    checks: [
      ...REPOSITORY_EVIDENCE_CHECK_NAMES.map((name) => ({
        name,
        status: name === missing ? 'NOT_VERIFIED' : 'PASS',
      })),
      { name: 'enterpriseProductionGate', status: 'NOT_VERIFIED' },
      { name: 'requiredChecks', status: 'NOT_VERIFIED' },
    ],
  };
}

test('repository evidence closes independently while release/runtime stays open', () => {
  const boundary = evaluateRepositoryCheckBoundary(checksFixture(), SHA);

  assert.equal(boundary.repositoryEvidenceComplete, true);
  assert.equal(boundary.namedRepositoryChecksPassed, true);
  assert.equal(boundary.requiredChecks, false);
  assert.equal(boundary.enterpriseProductionGate, false);
  assert.equal(boundary.releaseEvidenceComplete, false);
  assert.deepEqual(boundary.missingRepositoryChecks, []);
});

test('repository evidence fails closed when one named CI/security check is absent', () => {
  const boundary = evaluateRepositoryCheckBoundary(checksFixture({ missing: 'codeql' }), SHA);

  assert.equal(boundary.repositoryEvidenceComplete, false);
  assert.equal(boundary.namedRepositoryChecksPassed, false);
  assert.deepEqual(boundary.missingRepositoryChecks, ['codeql']);
});

test('repository evidence rejects stale SHA and unverified source provenance', () => {
  assert.equal(
    evaluateRepositoryCheckBoundary(checksFixture({ targetSha: 'b'.repeat(40) }), SHA).repositoryEvidenceComplete,
    false,
  );
  assert.equal(
    evaluateRepositoryCheckBoundary(checksFixture({ source: 'fixture' }), SHA).repositoryEvidenceComplete,
    false,
  );
});

test('compatibility view never changes the real production gate signal', () => {
  const compatibility = buildRepositoryDerivedCompatibilityView({ githubChecks: checksFixture(), targetSha: SHA });

  assert.equal(compatibility.enabled, true);
  assert.equal(compatibility.boundary.requiredChecks, false);
  assert.equal(compatibility.boundary.enterpriseProductionGate, false);
  assert.equal(compatibility.document.status, 'Complete');
  assert.equal(
    compatibility.document.checks.find((check) => check.name === 'requiredChecks')?.status,
    'PASS',
  );
  assert.equal(
    compatibility.document.checks.find((check) => check.name === 'enterpriseProductionGate')?.status,
    'NOT_VERIFIED',
  );
  assert.equal(compatibility.document.repositoryCompatibilityView.releaseRequiredChecksPassed, false);
  assert.equal(compatibility.document.repositoryCompatibilityView.enterpriseProductionGatePassed, false);
});
