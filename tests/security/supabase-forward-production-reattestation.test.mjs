import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { verifyForwardProductionReattestation } from '../../scripts/supabase/verify-forward-production-reattestation.mjs';

const CURRENT_SHA = 'a'.repeat(40);
const BASELINE_SHA = 'b'.repeat(40);
const CURRENT_DIGEST = `sha256:${'c'.repeat(64)}`;
const BASELINE_DIGEST = `sha256:${'d'.repeat(64)}`;
const VERSION = '20260910113000';
const FILENAME = `${VERSION}_reconcile_fria_operational_runtime_v43.sql`;
const FILE_DIGEST = 'e'.repeat(64);
const RECOVERY_RUN_ID = '24680';
const PROMOTION_RUN_ID = '13579';

function ledgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify([...versions].sort())).digest('hex')}`;
}

function manifest(targetSha, selectionDigest) {
  return {
    schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
    evidenceItem: 'supabase-forward-reconciliation-manifest',
    targetSha,
    changeSet: '2026-09-10-production-runtime-contract-v43',
    selectionDigest,
    migrations: [{
      version: VERSION,
      filename: FILENAME,
      sha256: FILE_DIGEST,
      sizeBytes: 1024,
    }],
    checks: {
      productionWriteAuthorized: false,
      migrationHistoryRepairAuthorized: false,
      unrestrictedDbPushAuthorized: false,
    },
  };
}

function baselineHumanApproval() {
  return {
    schema: 'risck-comply.supabase-forward-human-approval-proof.v1',
    status: 'Complete',
    outcome: 'passed',
    targetSha: BASELINE_SHA,
    selectionDigest: BASELINE_DIGEST,
    selectedMigrationCount: 1,
    checks: {
      acceptedHumanDecisionGate: true,
      everySelectedMigrationPendingDeployment: true,
      exactSelectedBytesCovered: true,
      reviewerProvenancePresent: true,
      schemaEvidenceReferencesPresent: true,
      rollbackReferencesPresent: true,
      productionWriteAuthorizedByDecisionGate: false,
    },
    migrations: [{ version: VERSION, filename: FILENAME, sha256: FILE_DIGEST }],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
      humanNamesStored: false,
      approvalReferenceStored: false,
    },
  };
}

function baselinePromotion() {
  return {
    schema: 'risck-comply.supabase-forward-reconciliation-promotion.v1',
    status: 'Complete',
    outcome: 'passed',
    targetSha: BASELINE_SHA,
    selectionDigest: BASELINE_DIGEST,
    selectedMigrationCount: 1,
    appliedVersions: [VERSION],
    checks: {
      exactShaBound: true,
      selectedMigrationsAbsentBeforePromotion: true,
      remoteHistoryPreserved: true,
      appliedSetEqualsSelectedSet: true,
      remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
    },
  };
}

function livePostconditions() {
  return {
    schema: 'risck-comply.supabase-forward-live-postconditions.v1',
    evidenceItem: 'supabase-forward-live-postconditions',
    status: 'Complete',
    outcome: 'passed',
    targetSha: CURRENT_SHA,
    selectionDigest: CURRENT_DIGEST,
    readOnly: true,
    postconditions: 'forward_reconciliation_and_cross_tenant_reference_postconditions_passed',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      databaseUrlsStored: false,
      rowDataStored: false,
    },
  };
}

function liveTenantProof() {
  return {
    schema: 'risck-comply.supabase-live-tenant-isolation.v1',
    evidenceItem: 'supabase-live-tenant-isolation',
    status: 'Complete',
    outcome: 'passed',
    targetSha: CURRENT_SHA,
    selectionDigest: CURRENT_DIGEST,
    readOnly: true,
    checks: {
      transactionReadOnly: true,
      isolatedExistingActorPairFound: true,
      canonicalOrganizationRlsForceRls: true,
      evidenceVaultRlsForceRls: true,
      evidenceStoragePoliciesCanonical: true,
      actorAOwnOrganizationVisible: true,
      actorAForeignOrganizationHidden: true,
      actorAOwnMembershipVisible: true,
      actorAForeignMembershipHidden: true,
      actorBOwnOrganizationVisible: true,
      actorBForeignOrganizationHidden: true,
      actorBOwnMembershipVisible: true,
      actorBForeignMembershipHidden: true,
      noProductionMutation: true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      userIdsStored: false,
      organizationIdsStored: false,
      rowDataStored: false,
      databaseUrlsStored: false,
    },
  };
}

function backupRestore(liveVersions) {
  return {
    schema: 'risck-comply.backup-restore-evidence.v2',
    evidenceItem: 'backup-restore-tested',
    status: 'Complete',
    outcome: 'passed',
    targetSha: CURRENT_SHA,
    observedSha: CURRENT_SHA,
    runId: RECOVERY_RUN_ID,
    checks: {
      backupExists: true,
      restoreExecuted: true,
      dataIntegrity: true,
      rlsAfterRestore: true,
      rlsPoliciesPresent: true,
      rpoMeasured: true,
      rtoMeasured: true,
      distinctDatabases: true,
      protectedMainExecution: true,
      exactShaBound: true,
      sourceMigrationLedgerCaptured: true,
    },
    integrity: {
      sourceMigrationLedger: {
        count: liveVersions.length,
        head: liveVersions.at(-1),
        sha256: ledgerDigest(liveVersions),
      },
    },
    forwardReconciliation: {
      selectedForwardMigrationCount: 1,
      selectedForwardSetPresentInSource: true,
      restoredPostconditionsExecuted: true,
      restoredPostconditionsPassed: true,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      databaseUrlsStored: false,
      dumpStored: false,
      rowDataStored: false,
    },
    failures: [],
  };
}

function validInput() {
  const liveVersions = ['20260909143000', VERSION];
  return {
    currentManifest: manifest(CURRENT_SHA, CURRENT_DIGEST),
    baselineManifest: manifest(BASELINE_SHA, BASELINE_DIGEST),
    baselineHumanApproval: baselineHumanApproval(),
    baselinePromotionTransition: baselinePromotion(),
    livePostconditions: livePostconditions(),
    liveTenantProof: liveTenantProof(),
    backupRestore: backupRestore(liveVersions),
    liveRemoteVersions: liveVersions,
    baselineRemoteAfter: liveVersions,
    releaseSha: CURRENT_SHA,
    baselinePromotionRunId: PROMOTION_RUN_ID,
    recoveryRunId: RECOVERY_RUN_ID,
    generatedAt: '2026-09-14T00:00:00.000Z',
  };
}

test('read-only production reattestation passes only with byte-identical promoted schema and exact-SHA recovery', () => {
  const evidence = verifyForwardProductionReattestation(validInput());
  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.targetSha, CURRENT_SHA);
  assert.equal(evidence.acceptanceMode, 'read_only_reattestation');
  assert.equal(evidence.checks.currentSelectedBytesEqualBaselinePromotedBytes, true);
  assert.equal(evidence.checks.productionMutationPerformedByReattestation, false);
  assert.equal(evidence.checks.backupRestoreExactShaPassed, true);
});

test('reattestation rejects a current migration byte change that was never promoted', () => {
  const input = validInput();
  input.currentManifest.migrations[0].sha256 = 'f'.repeat(64);
  assert.throws(
    () => verifyForwardProductionReattestation(input),
    /current selected migration bytes differ from baseline promotion/,
  );
});

test('reattestation rejects any live migration-ledger drift since the baseline promotion', () => {
  const input = validInput();
  input.liveRemoteVersions = [...input.liveRemoteVersions, '20260914120000'];
  assert.throws(
    () => verifyForwardProductionReattestation(input),
    /migration drift detected since baseline promotion/,
  );
});

test('reattestation rejects recovery evidence that is not bound to the fresh live ledger', () => {
  const input = validInput();
  input.backupRestore.integrity.sourceMigrationLedger.sha256 = `sha256:${'0'.repeat(64)}`;
  assert.throws(
    () => verifyForwardProductionReattestation(input),
    /backup\/restore source migration ledger digest differs from live ledger/,
  );
});
