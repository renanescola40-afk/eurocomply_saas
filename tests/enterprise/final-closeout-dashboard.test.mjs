import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

test('accepts PASS runtime evidence bound by releaseSha from an external evidence root', () => {
  const targetSha = 'a'.repeat(40);
  const root = mkdtempSync(path.join(os.tmpdir(), 'risck-closeout-dashboard-'));
  const evidencePath = 'runtime/pass.json';
  const absolute = path.join(root, evidencePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify({ status: 'PASS', releaseSha: targetSha })}\n`);
  const previous = process.env.ENTERPRISE_EVIDENCE_ROOTS;
  process.env.ENTERPRISE_EVIDENCE_ROOTS = root;

  try {
    const report = buildDashboard({
      productRegistry: {
        totalWeight: 100,
        workstreams: [{
          id: 'ONLY',
          name: 'Only lane',
          weight: 100,
          implementationEvidence: ['package.json'],
          testEvidence: ['package-lock.json'],
          runtimeEvidence: [evidencePath],
          humanReviewEvidence: [],
        }],
      },
      closureRegistry: { requirements: [] },
      targetSha,
    });
    assert.equal(report.scores.runtime, 100);
    assert.equal(report.scores.completed, 100);
    assert.equal(report.decision, 'ENTERPRISE_GO_CANDIDATE');
  } finally {
    if (previous === undefined) delete process.env.ENTERPRISE_EVIDENCE_ROOTS;
    else process.env.ENTERPRISE_EVIDENCE_ROOTS = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects runtime evidence whose embedded SHA does not match', () => {
  const targetSha = 'a'.repeat(40);
  const root = mkdtempSync(path.join(os.tmpdir(), 'risck-closeout-dashboard-'));
  const evidencePath = 'runtime/stale.json';
  const absolute = path.join(root, evidencePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify({ status: 'PASS', provenance: { commitSha: 'b'.repeat(40) } })}\n`);
  const previous = process.env.ENTERPRISE_EVIDENCE_ROOTS;
  process.env.ENTERPRISE_EVIDENCE_ROOTS = root;

  try {
    const report = buildDashboard({
      productRegistry: {
        totalWeight: 100,
        workstreams: [{
          id: 'ONLY',
          name: 'Only lane',
          weight: 100,
          implementationEvidence: ['package.json'],
          testEvidence: ['package-lock.json'],
          runtimeEvidence: [evidencePath],
          humanReviewEvidence: [],
        }],
      },
      closureRegistry: { requirements: [] },
      targetSha,
    });
    assert.equal(report.scores.runtime, 0);
    assert.equal(report.workstreams[0].runtime.status, 'REJECTED');
    assert.equal(report.workstreams[0].runtime.reason, 'sha_mismatch');
  } finally {
    if (previous === undefined) delete process.env.ENTERPRISE_EVIDENCE_ROOTS;
    else process.env.ENTERPRISE_EVIDENCE_ROOTS = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
