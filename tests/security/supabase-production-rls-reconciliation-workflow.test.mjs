import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/supabase-production-rls-reconciliation.yml', 'utf8');
const evidenceWriter = readFileSync('scripts/supabase/write-rls-reconciliation-closure-evidence.mjs', 'utf8');

test('production RLS reconciliation remains manual with verify-only as the safe default', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /default: verify_only/);
  assert.match(workflow, /- verify_only/);
  assert.match(workflow, /- apply/);
  assert.match(workflow, /APPLY_RLS_RECONCILIATION/);
  assert.match(workflow, /test "\$CONFIRMATION" = "APPLY_RLS_RECONCILIATION"/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  workflow_run:/);
});

test('environment governance is proven before the secret-backed production job can start', () => {
  const governanceIndex = workflow.indexOf('governance:');
  const reconcileIndex = workflow.indexOf('\n  reconcile:');
  const environmentIndex = workflow.indexOf('environment: production', reconcileIndex);
  const secretIndex = workflow.indexOf('secrets.SUPABASE_DB_POOLER_URL', reconcileIndex);

  assert.ok(governanceIndex >= 0);
  assert.ok(reconcileIndex > governanceIndex);
  assert.ok(environmentIndex > reconcileIndex);
  assert.ok(secretIndex > reconcileIndex);
  assert.match(workflow, /needs: governance/);
  assert.match(workflow, /GITHUB_ENVIRONMENT_NAME: production/);
  assert.match(workflow, /REQUIRE_PROTECTED_BRANCHES: 'true'/);
  assert.match(workflow, /check-github-environment-governance\.mjs/);
  assert.match(workflow, /permissions:\n  actions: read\n  contents: read/);
});

test('exact-main verification is required in both governance and secret-backed jobs', () => {
  assert.match(workflow, /git ls-remote origin refs\/heads\/main \| grep -q "\^\$\{TARGET_SHA\}"/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /test "\$\{RELEASE_SHA,,\}" = "\$main_sha"/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$main_sha"/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('production SQL executes only in explicitly confirmed apply mode', () => {
  assert.match(workflow, /if: \$\{\{ inputs\.mode == 'apply' \}\}/);
  assert.match(workflow, /20260726070000_permissions_catalog_rls_hotfix\.sql/);
  assert.match(workflow, /case "\$MODE" in[\s\S]*verify_only\)[\s\S]*apply\)[\s\S]*APPLY_RLS_RECONCILIATION/);

  const applyStep = workflow.indexOf('Apply idempotent RLS reconciliation only when explicitly authorized');
  const collectStep = workflow.indexOf('Collect RLS, grants, policies and migration evidence read-only');
  assert.ok(applyStep >= 0);
  assert.ok(collectStep > applyStep);
});

test('verify-only mode can collect canonical live proof without a production SQL mutation', () => {
  assert.match(workflow, /Collect RLS, grants, policies and migration evidence read-only/);
  assert.match(workflow, /select 'rls\|'/);
  assert.match(workflow, /select 'policy\|'/);
  assert.match(workflow, /select 'grant\|'/);
  assert.match(workflow, /select 'history\|'/);
  assert.match(workflow, /Production SQL mutation requested: `false`/);
});

test('canonical closure evidence is emitted only after deterministic PASS verification', () => {
  const collectIndex = workflow.indexOf('Collect RLS, grants, policies and migration evidence read-only');
  const verifyIndex = workflow.indexOf('Verify reconciliation proof deterministically');
  const emitIndex = workflow.indexOf('Emit canonical exact-SHA Enterprise 100 evidence');

  assert.ok(collectIndex >= 0);
  assert.ok(verifyIndex > collectIndex);
  assert.ok(emitIndex > verifyIndex);
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
