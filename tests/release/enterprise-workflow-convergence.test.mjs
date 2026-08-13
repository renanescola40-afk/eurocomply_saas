import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  productionGateAlreadyCoversEvidence,
} from '../../scripts/release/stabilize-enterprise-readiness-scorecard.mjs';

const stabilizerWorkflow = readFileSync(
  '.github/workflows/enterprise-readiness-scorecard-stabilizer.yml',
  'utf8',
);
const productionGateWorkflow = readFileSync(
  '.github/workflows/enterprise-production-gate.yml',
  'utf8',
);
const stabilizerScript = readFileSync(
  'scripts/release/stabilize-enterprise-readiness-scorecard.mjs',
  'utf8',
);

function workflowRunTriggerBlock(workflow) {
  const start = workflow.indexOf('  workflow_run:');
  const end = workflow.indexOf('\npermissions:', start);
  assert.ok(start >= 0, 'workflow_run trigger must exist');
  assert.ok(end > start, 'workflow_run trigger must terminate before permissions');
  return workflow.slice(start, end);
}

function gateRun({
  status = 'completed',
  conclusion = 'success',
  createdAt = '2026-08-13T09:00:00.000Z',
} = {}) {
  return {
    name: 'Enterprise Production Gate',
    head_sha: 'a'.repeat(40),
    status,
    conclusion,
    created_at: createdAt,
  };
}

test('scorecard stabilizer cannot subscribe to the production gate that it dispatches', () => {
  const trigger = workflowRunTriggerBlock(stabilizerWorkflow);

  assert.doesNotMatch(trigger, /^\s*- Enterprise Production Gate\s*$/m);
  assert.match(stabilizerScript, /dispatchProductionGate\(repository\)/);
  assert.match(stabilizerWorkflow, /cancel-in-progress: true/);
  assert.match(stabilizerWorkflow, /STABILIZER_DEBOUNCE_SECONDS: '90'/);
});

test('production gate collapses redundant successful same-SHA fan-in without hiding failed producer events', () => {
  assert.match(
    productionGateWorkflow,
    /group: enterprise-production-gate-\$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}-\$\{\{ github\.event_name == 'workflow_run' && github\.event\.workflow_run\.conclusion != 'success' && github\.run_id \|\| 'active' \}\}/,
  );
  assert.match(productionGateWorkflow, /cancel-in-progress: true/);
  assert.match(
    productionGateWorkflow,
    /github\.event\.workflow_run\.conclusion != 'success' && github\.run_id/,
    'non-success workflow_run events must retain a unique run-id group instead of being collapsed into the successful fan-in group',
  );
});

test('stabilizer never treats a failed or cancelled terminal production gate as evidence coverage', () => {
  const targetSha = 'a'.repeat(40);
  const cutoff = Date.parse('2026-08-13T08:59:00.000Z');

  assert.equal(productionGateAlreadyCoversEvidence([gateRun()], targetSha, cutoff), true);
  assert.equal(
    productionGateAlreadyCoversEvidence([gateRun({ conclusion: 'failure' })], targetSha, cutoff),
    false,
  );
  assert.equal(
    productionGateAlreadyCoversEvidence([gateRun({ conclusion: 'cancelled' })], targetSha, cutoff),
    false,
  );
  assert.equal(
    productionGateAlreadyCoversEvidence([
      gateRun({ status: 'in_progress', conclusion: null }),
    ], targetSha, cutoff),
    true,
  );
  assert.match(stabilizerScript, /latest\?\.status === 'completed' && latest\?\.conclusion === 'success'/);
  assert.match(stabilizerScript, /completed without success/);
  assert.match(
    stabilizerScript,
    /run\?\.status === 'completed' && run\?\.conclusion === 'success'/,
  );
});

test('production gate contract enforces convergence semantics in CI', () => {
  assert.match(
    productionGateWorkflow,
    /grep -Fq "cancel-in-progress: true" \.github\/workflows\/enterprise-production-gate\.yml/,
  );
  assert.doesNotMatch(
    productionGateWorkflow,
    /grep -Fq "cancel-in-progress: false" \.github\/workflows\/enterprise-production-gate\.yml/,
  );
});
