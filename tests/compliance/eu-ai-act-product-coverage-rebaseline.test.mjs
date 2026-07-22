import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateCoverage,
  validateRegistry,
} from '../../scripts/compliance/generate-eu-ai-act-product-coverage.mjs';

const SHA = 'a'.repeat(40);

function registry(overrides = {}) {
  return {
    schema: 'risck-comply.eu-ai-act-product-coverage-registry.v1',
    totalWeight: 100,
    workstreams: [
      {
        id: 'TEST-WORKSTREAM',
        name: 'Test workstream',
        weight: 100,
        implementationEvidence: [],
        testEvidence: [],
        runtimeEvidence: [],
        humanReviewEvidence: [],
      },
    ],
    ...overrides,
  };
}

test('complete evidence produces four distinct 100% scores and GO', () => {
  const report = generateCoverage({ registry: registry(), targetSha: SHA });
  assert.deepEqual(report.scores, {
    implementationCoverage: 100,
    ciVerifiedCoverage: 100,
    runtimeEvidenceCoverage: 100,
    completedCoverage: 100,
  });
  assert.equal(report.releaseDecision, 'EU_AI_ACT_PRODUCT_COVERAGE_GO');
  assert.equal(report.blockers.length, 0);
  assert.match(report.integrity.sha256, /^[a-f0-9]{64}$/);
});

test('missing implementation never earns downstream credit', () => {
  const input = registry();
  input.workstreams[0].implementationEvidence = ['definitely/missing/file.ts'];
  const report = generateCoverage({ registry: input, targetSha: SHA });
  assert.equal(report.scores.implementationCoverage, 0);
  assert.equal(report.scores.ciVerifiedCoverage, 0);
  assert.equal(report.scores.runtimeEvidenceCoverage, 0);
  assert.equal(report.scores.completedCoverage, 0);
  assert.equal(report.workstreams[0].state, 'NOT_STARTED');
  assert.equal(report.releaseDecision, 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO');
});

test('human review remains separate from runtime evidence', () => {
  const input = registry();
  input.workstreams[0].humanReviewEvidence = ['definitely/missing/review.json'];
  const report = generateCoverage({ registry: input, targetSha: SHA });
  assert.equal(report.scores.runtimeEvidenceCoverage, 100);
  assert.equal(report.scores.completedCoverage, 0);
  assert.equal(report.workstreams[0].state, 'HUMAN_REVIEW_REQUIRED');
});

test('registry must have unique IDs and exactly 100 weight', () => {
  const input = registry({ totalWeight: 99 });
  const failures = validateRegistry(input);
  assert.ok(failures.some((failure) => failure.includes('weights must total 100')));
});

test('unsafe evidence paths are rejected', () => {
  const input = registry();
  input.workstreams[0].implementationEvidence = ['../secret'];
  assert.ok(validateRegistry(input).some((failure) => failure.includes('unsafe evidence path')));
});

test('short or uppercase SHA is rejected', () => {
  assert.throws(() => generateCoverage({ registry: registry(), targetSha: 'ABC123' }), /full lowercase Git SHA/);
});
