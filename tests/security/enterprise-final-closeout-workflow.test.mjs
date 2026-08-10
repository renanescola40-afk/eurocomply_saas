import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-final-closeout-dashboard.yml', 'utf8');
const generator = readFileSync('scripts/enterprise/generate-final-closeout-dashboard.mjs', 'utf8');
const hydrator = readFileSync('scripts/enterprise/hydrate-exact-sha-evidence.mjs', 'utf8');

test('workflow uses read-only permissions and immutable action pins', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('strict mode remains fail-closed and exact-SHA bound', () => {
  assert.match(workflow, /generate-final-closeout-dashboard\.mjs --strict/);
  assert.match(generator, /ENTERPRISE_TARGET_SHA must be a full lowercase 40-character Git SHA/);
  assert.match(generator, /sha_mismatch/);
  assert.match(generator, /sensitive_values/);
  assert.match(generator, /report\.scores\.completed !== 100/);
});

test('dashboard keeps implementation runtime and human review separate', () => {
  assert.match(generator, /implementation:/);
  assert.match(generator, /runtime:/);
  assert.match(generator, /humanReview:/);
  assert.match(generator, /completed:/);
  assert.match(generator, /remaining:/);
  assert.match(generator, /does not create, fabricate or independently approve/);
});

test('retained evidence is filtered by exact workflow SHA and hydrated in isolation', () => {
  assert.match(workflow, /\.workflow_run\.head_sha/);
  assert.match(workflow, /\.workflow_run\.head_sha\] \| @tsv/);
  assert.match(workflow, /test "\$artifact_sha" = "\$TARGET_SHA"/);
  assert.match(workflow, /HYDRATED_EVIDENCE_ROOT: artifacts\/exact-sha-evidence-root/);
  assert.match(workflow, /hydrate-exact-sha-evidence\.mjs/);
  assert.match(hydrator, /REJECTED_SENSITIVE/);
  assert.match(hydrator, /AMBIGUOUS/);
  assert.match(hydrator, /candidate\.sha === targetSha/);
  assert.match(hydrator, /never converted into PASS/);
});

test('same-SHA producer completions queue instead of cancelling earlier closeout runs', () => {
  assert.match(workflow, /group: enterprise-final-closeout-dashboard-/);
  assert.match(workflow, /cancel-in-progress: false/);
});
