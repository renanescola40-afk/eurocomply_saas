import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/qualified-review-execution.yml', 'utf8');

test('workflow is read-only and protected', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /environment: qualified-legal-review/);
  assert.match(workflow, /confirmation/);
  assert.match(workflow, /CLOSE_QUALIFIED_REVIEWS/);
  assert.match(workflow, /persist-credentials: false/);
});

test('workflow never promotes accepted evidence automatically', () => {
  assert.doesNotMatch(workflow, /git push|gh pr create|contents: write/);
  assert.match(workflow, /prepare-qualified-review-promotion\.mjs/);
});
