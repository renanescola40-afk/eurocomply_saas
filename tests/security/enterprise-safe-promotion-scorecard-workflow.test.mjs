import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile('.github/workflows/enterprise-safe-promotion-scorecard.yml', 'utf8');
const builder = await readFile('scripts/enterprise/build-canonical-promoted-scorecard.mjs', 'utf8');

test('workflow is triggered only by successful main safe bootstrap or explicit manual confirmation', () => {
  assert.match(workflow, /workflows: \[Enterprise Safe Runtime Bootstrap\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /IMPORT_SAFE_PROMOTION/);
  assert.match(workflow, /commits\/main/);
});

test('workflow downloads the exact SHA-scoped artifact from the exact source run', () => {
  assert.match(workflow, /enterprise-safe-runtime-bootstrap-\$\{\{ env\.ASSESSED_SHA \}\}/);
  assert.match(workflow, /run-id: \$\{\{ env\.SOURCE_RUN_ID \}\}/);
  assert.match(workflow, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test "\$current_main" = "\$ASSESSED_SHA"/);
});

test('final builder remains monotonic, exact-SHA and permanently NO_GO for safe evidence', () => {
  for (const pattern of [
    /promotion\.targetSha !== targetSha/,
    /closeout\.workflowRunId/,
    /promotion cannot reduce canonical completion/,
    /safe promotion cannot declare 100 percent/,
    /releaseDecision: 'NO_GO'/,
    /FORBIDDEN_PROMOTED_CONTROLS/,
    /rejected evidence must be zero/,
    /coherencePromoted !== false/,
  ]) assert.match(builder, pattern);
  assert.doesNotMatch(workflow, /actions:\s*write/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
});
