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

test('workflow binds the source artifact to exact current main and drift workflow', () => {
  assert.match(workflow, /Verify exact current main SHA/);
  assert.match(workflow, /test "\$\{head_sha,,\}" = "\$\{TARGET_SHA,,\}"/);
  assert.match(workflow, /test "\$workflow_path" = "\.github\/workflows\/supabase-migration-drift-audit\.yml"/);
  assert.match(workflow, /environment: production-migration-reconciliation/);
  assert.match(workflow, /retention-days: 90/);
});

test('workflow accepts fail-closed audit conclusions only with complete evidence', () => {
  assert.match(workflow, /success\|failure/);
  assert.match(workflow, /test "\$status" = "completed"/);
  assert.match(workflow, /supabase-migration-drift-\$\{TARGET_SHA,,\}/);
  assert.match(workflow, /migration-state-remote\.txt/);
  assert.match(workflow, /migration-drift\.json/);
  assert.match(workflow, /migration-reconciliation-inventory\.json/);
  assert.match(workflow, /Unexpected migration reconciliation inventory schema/);
  assert.match(workflow, /Source drift audit must be completed with success or fail-closed failure/);
});

test('workflow rejects authentication-only or incomplete artifacts', () => {
  assert.match(workflow, /test -s artifacts\/supabase-migration-drift\/migration-state-remote\.txt/);
  assert.match(workflow, /test -s artifacts\/supabase-migration-drift\/migration-drift\.json/);
  assert.match(workflow, /test -s artifacts\/supabase-migration-drift\/migration-reconciliation-inventory\.json/);
  assert.match(workflow, /Incomplete migration drift evidence/);
  assert.match(workflow, /Source drift audit claims a database mutation/);
});

test('template is explicitly non-evidence', () => {
  assert.equal(template.truthBoundary.templateIsEvidence, false);
  assert.equal(template.truthBoundary.productionPushAuthorized, false);
});
