import assert from 'node:assert/strict';
import test from 'node:test';

import {
  promotionLineageEnvLines,
  validateSupabaseLiveReattestationSource,
} from '../../scripts/security/validate-supabase-live-reattestation-source.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '24680';
const CONTRACT = { changeSet: 'test-v43-forward-set', count: 4 };

function validate(evidence) {
  return validateSupabaseLiveReattestationSource(evidence, {
    expectedSha: SHA,
    expectedRunId: RUN_ID,
    contract: CONTRACT,
  });
}

function validEvidence() {
  return {
    schema: 'risck-comply.supabase-forward-production-acceptance.v1',
    evidenceItem: 'supabase-forward-production-acceptance',
    status: 'Complete',
    outcome: 'passed',
    acceptanceMode: 'read_only_reattestation',
    targetSha: SHA,
    selectionDigest: `sha256:${'b'.repeat(64)}`,
    selectedMigrationCount: 4,
    baselinePromotionRunId: '13579',
    baselinePromotionSha: 'c'.repeat(40),
    recoveryRunId: '97531',
    checks: {
      exactShaBound: true,
      baselinePromotionWorkflowTrusted: true,
      baselineHumanDecisionGateAccepted: true,
      currentSelectedBytesEqualBaselinePromotedBytes: true,
      currentSelectedMigrationsPresentInLiveLedger: true,
      migrationDriftSinceBaselineAbsent: true,
      productionMutationPerformedByReattestation: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
      liveSchemaSecurityPostconditionsPassed: true,
      livePostconditionProofReadOnly: true,
      liveTenantIsolationPassed: true,
      liveTenantProofReadOnly: true,
      backupRestoreExactShaPassed: true,
      backupRestoreSourceLedgerMatchesLive: true,
      restoredForwardPostconditionsPassed: true,
      providerCredentialRevocationClaimed: false,
    },
    recoveryBoundary: {
      backupRestoreProven: true,
      sourceMigrationLedgerBoundToFreshLiveLedger: true,
      restoredForwardPostconditionsProven: true,
      providerCredentialRevocationClaimed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
      userIdsStored: false,
      organizationIdsStored: false,
    },
  };
}

test('accepts only canonical Complete exact-SHA read-only reattestation evidence', () => {
  const result = validate(validEvidence());
  assert.equal(result.status, 'Complete');
  assert.equal(result.outcome, 'passed');
  assert.equal(result.authorityMode, 'read_only_reattestation');
  assert.equal(result.targetSha, SHA);
});

test('hydrates the verified baseline promotion lineage required by canonical RLS evidence', () => {
  const result = validate(validEvidence());

  assert.deepEqual(result.promotionLineage, {
    promotionRunId: '13579',
    changeSet: CONTRACT.changeSet,
    selectedMigrationCount: CONTRACT.count,
    selectionDigest: `sha256:${'b'.repeat(64)}`,
    manifestMatchVerified: true,
    remoteAfterEqualsBeforePlusSelected: true,
    unauthorizedMigrationApplied: false,
    productionPromotionVerified: true,
  });

  assert.deepEqual(promotionLineageEnvLines(result), [
    'PROMOTION_LINEAGE_RUN_ID=13579',
    `PROMOTION_CHANGE_SET=${CONTRACT.changeSet}`,
    'PROMOTION_SELECTED_MIGRATION_COUNT=4',
    `PROMOTION_SELECTION_DIGEST=sha256:${'b'.repeat(64)}`,
    'PROMOTION_MANIFEST_MATCH_VERIFIED=true',
    'PROMOTION_REMOTE_TRANSITION_VERIFIED=true',
    'PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED=false',
    'PROMOTION_PRODUCTION_VERIFIED=true',
  ]);
});

test('rejects a migration count that no longer matches the current governed manifest', () => {
  const evidence = validEvidence();
  evidence.selectedMigrationCount = 3;
  assert.throws(() => validate(evidence), /does not match current governed manifest/);
});

test('rejects a different release SHA', () => {
  const evidence = validEvidence();
  evidence.targetSha = 'd'.repeat(40);
  assert.throws(() => validate(evidence), /target SHA mismatch/);
});

test('rejects migration drift or missing recovery proof', () => {
  const drift = validEvidence();
  drift.checks.migrationDriftSinceBaselineAbsent = false;
  assert.throws(() => validate(drift), /migrationDriftSinceBaselineAbsent/);

  const recovery = validEvidence();
  recovery.recoveryBoundary.backupRestoreProven = false;
  assert.throws(() => validate(recovery), /backup\/restore boundary/);
});

test('rejects any Production mutation, migration repair, or unrestricted db push', () => {
  for (const field of ['productionMutationPerformedByReattestation', 'migrationHistoryRepairPerformed', 'unrestrictedDbPushPerformed']) {
    const evidence = validEvidence();
    evidence.checks[field] = true;
    assert.throws(() => validate(evidence), new RegExp(field));
  }
});

test('rejects retained sensitive evidence', () => {
  const evidence = validEvidence();
  evidence.evidenceIntegrity.databaseUrlsStored = true;
  assert.throws(() => validate(evidence), /databaseUrlsStored/);
});
