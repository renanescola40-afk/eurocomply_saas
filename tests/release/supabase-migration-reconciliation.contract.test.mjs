import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const script = await readFile('scripts/supabase/compile-migration-reconciliation.mjs', 'utf8');
const workflow = await readFile('.github/workflows/supabase-migration-reconciliation.yml', 'utf8');
const template = JSON.parse(await readFile('docs/security/evidence/templates/supabase-migration-reconciliation-decisions.json', 'utf8'));

test('compiler fails closed on missing or mismatched evidence', () => {
  assert.match(script, /unclassified inventory item/);
  assert.match(script, /digest mismatch/);
  assert.match(script, /reviewer and approver must be distinct/);
  assert.match(script, /already-present item lacks object proof digest/);
  assert.match(script, /pending deployment lacks staged execution plan/);
});

test('compiler never authorizes production writes', () => {
  assert.match(script, /productionPushAuthorized: false/);
  assert.match(script, /unrestrictedDbPushAllowed: false/);
  assert.match(script, /databaseModified: false/);
  assert.match(script, /migrationHistoryModified: false/);
});

test('workflow binds source artifact to exact current main SHA', () => {
  assert.match(workflow, /Verify exact current main SHA/);
  assert.match(workflow, /test "\$head_sha" = "\$\{\{ inputs\.target_sha \}\}"/);
  assert.match(workflow, /environment: production-migration-reconciliation/);
  assert.match(workflow, /retention-days: 90/);
});

test('template is explicitly non-evidence', () => {
  assert.equal(template.truthBoundary.templateIsEvidence, false);
  assert.equal(template.truthBoundary.productionPushAuthorized, false);
});
