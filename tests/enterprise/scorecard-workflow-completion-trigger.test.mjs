import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/enterprise-readiness-scorecard.yml';
const workflow = readFileSync(workflowPath, 'utf8');

const requiredCompletionTriggers = Object.freeze([
  'CI',
  'CodeQL',
  'Semgrep',
  'Secret Scanning',
  'Scan repository for accidental secret exposure',
  'Dependency Review',
  'Actionlint',
  'Public Claims Guard',
  'Full Security Suite',
  'Enterprise Production Gate',
  'RISCK COMPLY Security CI',
  'Enterprise DAST',
  'Dependency Vulnerability Proof',
  'Distributed Rate Limit Runtime Proof',
  'Auth RBAC Tenant Proof',
  'Supabase Live RLS Validation',
  'Production Runtime Proof',
  'Branch Protection Runtime Proof',
  'Final Technical Controls Proof',
  'Recovery Resilience Proof',
]);

function workflowRunNames(source) {
  const match = source.match(/\n  workflow_run:\n    workflows:\n(?<entries>(?:      - .+\n)+)    types: \[completed\]/);
  assert.ok(match?.groups?.entries, 'workflow_run must use a reviewable block-list followed by types: [completed]');
  return match.groups.entries
    .split('\n')
    .map((line) => line.match(/^      - (.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

test('scorecard reruns after every required exact-SHA evidence producer completes', () => {
  const names = workflowRunNames(workflow);
  assert.deepEqual(new Set(names).size, names.length, 'workflow_run list must not contain duplicates');
  assert.deepEqual([...names].sort(), [...requiredCompletionTriggers].sort());
});

test('scorecard workflow cannot trigger itself and only consumes successful workflow_run events', () => {
  const names = workflowRunNames(workflow);
  assert.equal(names.includes('Enterprise Readiness Scorecard'), false);
  assert.match(workflow, /if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /permissions:\s*write-all/);
});

test('scorecard concurrency is scoped to the exact assessed SHA', () => {
  assert.match(
    workflow,
    /group: enterprise-readiness-scorecard-\$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
  );
  assert.match(workflow, /cancel-in-progress: true/);
});
