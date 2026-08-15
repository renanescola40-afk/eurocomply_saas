import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');

const JOB_GUARD = "if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.head_sha == github.sha }}";
const EXPECTED_SHA_BINDING = 'ENTERPRISE_CLOSURE_EXPECTED_SHA: ${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}';

test('stale workflow_run producers are skipped before Enterprise 100 closure execution', () => {
  const contractIndex = workflow.indexOf('  contract:');
  const guardIndex = workflow.indexOf(JOB_GUARD, contractIndex);
  const stepsIndex = workflow.indexOf('    steps:', contractIndex);

  assert.notEqual(contractIndex, -1, 'Enterprise closure contract job must exist');
  assert.notEqual(guardIndex, -1, 'contract job must reject stale workflow_run triggers');
  assert.notEqual(stepsIndex, -1, 'contract job steps must exist');
  assert.ok(guardIndex > contractIndex && guardIndex < stepsIndex, 'stale trigger guard must run at job level before checkout/tests');
});

test('current-SHA execution remains exact-SHA bound and fail closed after the stale-trigger guard', () => {
  assert.ok(workflow.includes(EXPECTED_SHA_BINDING));
  assert.match(workflow, /- name: Validate target SHA is exact current main/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.match(workflow, /test "\$main_sha" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
