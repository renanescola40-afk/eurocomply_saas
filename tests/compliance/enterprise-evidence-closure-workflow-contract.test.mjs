import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/enterprise-evidence-closure.yml', 'utf8');
const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/enterprise-evidence-closure-registry.json', 'utf8'));

test('strict closure requires the protected runtime-proof environment', () => {
  assert.match(workflow, /strict-closure:[\s\S]*environment:\s*enterprise-runtime-proof/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /validate-enterprise-evidence-closure\.mjs --strict/);
});

test('workflow uses read-only repository permissions and immutable evidence artifacts', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.match(workflow, /enterprise-evidence-closure-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /retention-days:\s*90/);
});

test('registry IDs and target paths are unique and repository-relative', () => {
  const ids = registry.requirements.map((item) => item.id);
  const paths = registry.requirements.map((item) => item.path);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(paths).size, paths.length);
  for (const target of paths) {
    assert.ok(!target.startsWith('/'));
    assert.ok(!target.includes('..'));
    assert.match(target, /\.json$/);
  }
});
