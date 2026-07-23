import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/qualified-review-assurance.yml','utf8');

test('workflow is read-only and retains exact-SHA artifacts', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /qualified-review-assurance-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /retention-days: 90/);
});

test('strict mode fails closed without blocking report mode', () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /inputs\.strict == true/);
  assert.match(workflow, /steps\.validate\.outcome != 'success'/);
  assert.match(workflow, /continue-on-error/);
});
