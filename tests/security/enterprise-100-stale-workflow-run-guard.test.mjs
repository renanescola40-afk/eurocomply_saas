import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');

const JOB_GUARD = "if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.head_sha == github.sha }}";
const DYNAMIC_JOB_NAME = "name: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha != github.sha && 'Stale Enterprise closure trigger (ignored)' || 'Enterprise closure contract' }}";
const EXPECTED_SHA_BINDING = 'ENTERPRISE_CLOSURE_EXPECTED_SHA: ${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}';

test('stale workflow_run producers are skipped before Enterprise 100 closure execution under a non-authoritative check name', () => {
  const contractIndex = workflow.indexOf('  contract:');
  const guardIndex = workflow.indexOf(JOB_GUARD, contractIndex);
  const nameIndex = workflow.indexOf(DYNAMIC_JOB_NAME, contractIndex);
  const stepsIndex = workflow.indexOf('    steps:', contractIndex);

  assert.notEqual(contractIndex, -1, 'Enterprise closure contract job must exist');
  assert.notEqual(guardIndex, -1, 'contract job must reject stale workflow_run triggers');
  assert.notEqual(nameIndex, -1, 'stale workflow_run must use a non-authoritative check name');
  assert.notEqual(stepsIndex, -1, 'contract job steps must exist');
  assert.ok(guardIndex > contractIndex && guardIndex < stepsIndex, 'stale trigger guard must run at job level before checkout/tests');
  assert.ok(nameIndex > contractIndex && nameIndex < stepsIndex, 'check name must be resolved at job level before execution');
  assert.equal((workflow.match(/Stale Enterprise closure trigger \(ignored\)/g) ?? []).length, 1);
});

test('current-SHA execution alone retains the authoritative Enterprise closure contract name and fail-closed binding', () => {
  assert.ok(workflow.includes(DYNAMIC_JOB_NAME));
  assert.ok(workflow.includes(EXPECTED_SHA_BINDING));
  assert.match(workflow, /- name: Validate target SHA is exact current main/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.match(workflow, /test "\$main_sha" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
