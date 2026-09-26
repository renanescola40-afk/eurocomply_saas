import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-runtime-evidence-closeout.yml', 'utf8');

test('runtime closeout hydrates retained exact-SHA evidence before public production final', () => {
  const hydrationIndex = workflow.indexOf('Hydrate retained exact-SHA runtime evidence');
  const releaseIndex = workflow.indexOf('Run public production final validation');

  assert.ok(hydrationIndex >= 0, 'retained runtime evidence hydration step must exist');
  assert.ok(releaseIndex > hydrationIndex, 'hydration must run before release:production-final');
  assert.match(workflow, /run: node scripts\/release\/hydrate-enterprise-retained-runtime-evidence\.mjs/);
  assert.match(workflow, /^\s{10}GITHUB_TOKEN: \$\{\{ github\.token \}\}$/m);
  assert.match(workflow, /^\s{10}TARGET_SHA: \$\{\{ inputs\.release_sha \}\}$/m);
  assert.match(workflow, /^\s{10}RETAINED_PROOF_OPTIONAL_ERRORS_AS_MISSING: 'false'$/m);
});
