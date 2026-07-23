import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/final-runtime-assurance.yml', 'utf8');

test('workflow is read-only and exact-SHA bound', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /TARGET_SHA:/);
  assert.match(workflow, /ref: \$\{\{ inputs\.target_sha \|\| github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
});

test('workflow retains evidence and fails when missing', () => {
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /validate-final-runtime-assurance\.mjs/);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write|id-token: write/);
});
