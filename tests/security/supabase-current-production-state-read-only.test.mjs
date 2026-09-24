import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateSupabaseCurrentProductionStateSource } from '../../scripts/security/validate-supabase-current-state-source.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '24680';
const PROJECT_DIGEST = 'sha256:' + 'b'.repeat(64);

function validEvidence() {
  return {
    schema: 'risck-comply.supabase-current-production-state.v1',
    evidenceItem: 'supabase-current-production-state-read-only',
    status: 'Complete',
    outcome: 'passed',
    authorityMode: 'current_production_state_read_only',
    targetSha: SHA,
    productionProjectDigest: PROJECT_DIGEST,
    migrationLedger: { count: 12, head: '20260923000000', sha256: 'sha256:' + 'c'.repeat(64) },
    githubActions: { repository: 'renanescola40-afk/eurocomply_saas', branch: 'main', runId: RUN_ID, commitSha: SHA },
    checks: {
      exactShaBound: true, productionEnvironmentGoverned: true, productionProjectBound: true,
      migrationLedgerCapturedReadOnly: true, liveSchemaSecurityPostconditionsPassed: true, livePostconditionsReadOnly: true,
      liveTenantIsolationPassed: true, liveTenantProofReadOnly: true, forceRlsVerified: true, crossTenantIsolationVerified: true,
      noProductionMutation: true, dbPushPerformed: false, migrationRepairPerformed: false, manualLedgerInsertionPerformed: false,
      historicalPromotionVerified: false, humanReviewedMigrationBytesPromoted: false, remoteAfterEqualsBeforePlusSelected: false, backupRestoreProven: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false, credentialsStored: false, databaseUrlsStored: false,
      rowDataStored: false, userIdsStored: false, organizationIdsStored: false,
    },
    truthBoundary: 'current state only',
  };
}

test('accepts canonical exact-SHA read-only current Production state authority', () => {
  const result = validateSupabaseCurrentProductionStateSource(validEvidence(), { expectedSha: SHA, expectedRunId: RUN_ID, expectedProjectDigest: PROJECT_DIGEST });
  assert.equal(result.status, 'Complete');
  assert.equal(result.authorityMode, 'current_production_state_read_only');
});

test('rejects current-state evidence from a different Production project', () => {
  const evidence = validEvidence();
  evidence.productionProjectDigest = 'sha256:' + 'd'.repeat(64);
  assert.throws(
    () => validateSupabaseCurrentProductionStateSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID, expectedProjectDigest: PROJECT_DIGEST }),
    /project digest mismatch/,
  );
});

test('rejects current-state evidence that claims historical promotion lineage', () => {
  const evidence = validEvidence();
  evidence.checks.historicalPromotionVerified = true;
  assert.throws(() => validateSupabaseCurrentProductionStateSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID, expectedProjectDigest: PROJECT_DIGEST }), /historicalPromotionVerified/);
});

test('rejects current-state evidence that does not prove read-only tenant isolation', () => {
  const evidence = validEvidence();
  evidence.checks.noProductionMutation = false;
  assert.throws(() => validateSupabaseCurrentProductionStateSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID, expectedProjectDigest: PROJECT_DIGEST }), /noProductionMutation/);
});

test('workflow is protected exact-SHA bound and mutation-free by contract', async () => {
  const workflow = await readFile('.github/workflows/supabase-current-production-state-read-only.yml', 'utf8');
  for (const token of [
    'environment: Production',
    'ATTEST_CURRENT_PRODUCTION_STATE_READ_ONLY',
    'begin transaction read only',
    'assert-live-tenant-isolation-read-only.sql',
    'verify-forward-reconciliation-postconditions.sql',
    'verify-cross-tenant-reference-integrity-postconditions.sql',
    'supabase-project-binding.mjs emit-pooler-digest',
    'supabase-current-production-state-read-only-${{ env.TARGET_SHA }}',
  ]) assert.ok(workflow.includes(token), 'missing workflow token: ' + token);
  assert.doesNotMatch(workflow, /\bdb push\b/);
  assert.doesNotMatch(workflow, /migration repair/);
  assert.doesNotMatch(workflow, /insert into supabase_migrations/i);
});
