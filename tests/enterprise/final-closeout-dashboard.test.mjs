import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDashboard } from '../../scripts/enterprise/generate-final-closeout-dashboard.mjs';

const productRegistry = {
  totalWeight: 100,
  workstreams: [
    {
      id: 'A',
      name: 'Implemented lane',
      weight: 50,
      implementationEvidence: ['package.json'],
      testEvidence: ['package-lock.json'],
      runtimeEvidence: [],
      humanReviewEvidence: [],
    },
    {
      id: 'B',
      name: 'External lane',
      weight: 50,
      implementationEvidence: ['package.json'],
      testEvidence: ['package-lock.json'],
      runtimeEvidence: ['missing-runtime.json'],
      humanReviewEvidence: ['missing-review.json'],
    },
  ],
};

const closureRegistry = {
  requirements: [
    { id: 'B-REVIEW', workstream: 'B', kind: 'human_review', path: 'missing-review.json' },
  ],
};

test('reports implementation separately from runtime and human assurance', () => {
  const report = buildDashboard({ productRegistry, closureRegistry, targetSha: '' });
  assert.equal(report.scores.implementation, 100);
  assert.equal(report.scores.runtime, 50);
  assert.equal(report.scores.humanReview, 50);
  assert.equal(report.scores.completed, 50);
  assert.equal(report.scores.remaining, 50);
  assert.equal(report.decision, 'ENTERPRISE_NO_GO');
  assert.deepEqual(report.blockers, [{ id: 'B', weight: 50, missing: ['runtime', 'human_review'] }]);
});

test('never converts absent evidence into pass', () => {
  const report = buildDashboard({
    productRegistry: {
      totalWeight: 100,
      workstreams: [{
        id: 'ONLY',
        name: 'Only lane',
        weight: 100,
        implementationEvidence: ['missing.ts'],
        testEvidence: ['missing.test.ts'],
        runtimeEvidence: ['missing-runtime.json'],
        humanReviewEvidence: [],
      }],
    },
    closureRegistry: { requirements: [] },
    targetSha: 'a'.repeat(40),
  });
  assert.equal(report.scores.implementation, 0);
  assert.equal(report.scores.runtime, 0);
  assert.equal(report.scores.completed, 0);
  assert.equal(report.scores.remaining, 100);
});
