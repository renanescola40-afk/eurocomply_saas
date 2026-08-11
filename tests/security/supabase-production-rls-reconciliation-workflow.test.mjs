import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/supabase-production-rls-reconciliation.yml', 'utf8');
const evidenceWriter = readFileSync('scripts/supabase/write-rls-reconciliation-closure-evidence.mjs', 'utf8');

test('production RLS reconciliation remains manual and explicitly confirmed', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /APPLY_RLS_RECONCILIATION/);
  assert.match(workflow, /test "\$CONFIRMATION" = "APPLY_RLS_RECONCILIATION"/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  workflow_run:/);
});

test('production mutation is exact-main and environment protected', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /test "\$\{RELEASE_SHA,,\}" = "\$main_sha"/);
  assert.match(workflow, /20260726070000_permissions_catalog_rls_hotfix\.sql/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('canonical closure evidence is emitted only after deterministic PASS verification', () => {
  assert.match(workflow, /verify-rls-reconciliation-proof\.mjs/);
  assert.match(workflow, /write-rls-reconciliation-closure-evidence\.mjs/);
  assert.match(workflow, /release-validation\/supabase-rls-reconciliation\.json/);
  assert.match(evidenceWriter, /verification\.status !== 'PASS'/);
  assert.match(evidenceWriter, /targetSha/);
  assert.match(evidenceWriter, /expectedSha: targetSha/);
  assert.match(evidenceWriter, /status: 'PASS'/);
  assert.match(evidenceWriter, /containsSensitiveValues: false/);
});

test('immutable artifact contains both raw proof and canonical Enterprise 100 evidence', () => {
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(workflow, /name: supabase-rls-reconciliation-\$\{\{ inputs\.release_sha \}\}/);
  assert.match(workflow, /artifacts\/supabase-rls-reconciliation/);
  assert.match(workflow, /release-validation\/supabase-rls-reconciliation\.json/);
  assert.match(workflow, /if-no-files-found: error/);
});
