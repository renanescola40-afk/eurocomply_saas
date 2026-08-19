import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { verifyForwardProductionAcceptance } from './verify-forward-production-acceptance.mjs';

const sha = 'a'.repeat(40);
const selectionDigest = `sha256:${'b'.repeat(64)}`;
const migrationDigestA = '1'.repeat(64);
const migrationDigestB = '2'.repeat(64);
const promotionRunId = '12345';
const recoveryRunId = '67890';

function ledgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify(versions)).digest('hex')}`;
}

function fixture() {
  const selected = [
    { version: '20260817000000', filename: '20260817000000_first.sql', sha256: migrationDigestA },
    { version: '20260817000001', filename: '20260817000001_second.sql', sha256: migrationDigestB },
  ];
  const remoteAfter = ['20260813124224', ...selected.map((item) => item.version)];
  return {
    manifest: {
      schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
      targetSha: sha,
      selectionDigest,
      migrations: selected,
      checks: {
        productionWriteAuthorized: false,
        migrationHistoryRepairAuthorized: false,
        unrestrictedDbPushAuthorized: false,
      },
    },
    humanApproval: {
      schema: 'risck-comply.supabase-forward-human-approval-proof.v1',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest,
      selectedMigrationCount: 2,
      migrations: selected.map((item, index) => ({ ...item, deployOrderDecision: index + 1 })),
      checks: {
        acceptedHumanDecisionGate: true,
        everySelectedMigrationPendingDeployment: true,
        exactSelectedBytesCovered: true,
        reviewerProvenancePresent: true,
        schemaEvidenceReferencesPresent: true,
        rollbackReferencesPresent: true,
        productionWriteAuthorizedByDecisionGate: false,
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        credentialsStored: false,
        databaseUrlsStored: false,
        rowDataStored: false,
        humanNamesStored: false,
        approvalReferenceStored: false,
      },
    },
    promotionTransition: {
      schema: 'risck-comply.supabase-forward-reconciliation-promotion.v1',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest,
      selectedMigrationCount: 2,
      appliedVersions: selected.map((item) => item.version),
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
    },
    livePostconditions: {
      schema: 'risck-comply.supabase-forward-live-postconditions.v1',
      evidenceItem: 'supabase-forward-live-postconditions',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest,
      readOnly: true,
      postconditions: 'forward_reconciliation_postconditions_passed',
      evidenceIntegrity: {
        containsSensitiveValues: false,
        databaseUrlsStored: false,
        rowDataStored: false,
      },
    },
    liveTenantProof: {
      schema: 'risck-comply.supabase-live-tenant-isolation.v1',
      evidenceItem: 'supabase-live-tenant-isolation',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest,
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
    },
    backupRestore: {
      schema: 'risck-comply.backup-restore-evidence.v2',
      evidenceItem: 'backup-restore-tested',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      observedSha: sha,
      runId: recoveryRunId,
      repository: 'renanescola40-afk/eurocomply_saas',
      controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'],
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
      metrics: { rpoSeconds: 8, rtoSeconds: 40 },
      integrity: {
        sourceMigrationLedger: {
          count: remoteAfter.length,
          head: remoteAfter.at(-1),
          sha256: ledgerDigest(remoteAfter),
        },
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        databaseUrlsStored: false,
        dumpStored: false,
        rowDataStored: false,
        migrationVersionsStored: false,
        sourceMigrationLedgerDigestStored: true,
      },
      failures: [],
    },
    liveRemoteVersions: [...remoteAfter],
    promotedRemoteAfter: [...remoteAfter],
    releaseSha: sha,
    promotionRunId,
    recoveryRunId,
  };
}

test('accepts only one exact-SHA chain across human review, promotion, live tenancy, drift and recovery', () => {
  const result = verifyForwardProductionAcceptance(fixture());
  assert.equal(result.status, 'Complete');
  assert.equal(result.outcome, 'passed');
  assert.equal(result.selectedMigrationCount, 2);
  assert.equal(result.checks.liveTenantIsolationPassed, true);
  assert.equal(result.checks.postPromotionMigrationDriftAbsent, true);
  assert.equal(result.checks.backupRestoreExactShaPassed, true);
  assert.equal(result.checks.backupRestoreSourceLedgerMatchesPromotion, true);
  assert.equal(result.checks.providerCredentialRevocationClaimed, false);
  assert.equal(result.recoveryBoundary.providerCredentialRevocationClaimed, false);
});

test('rejects human-reviewed byte drift from the selected manifest', () => {
  const input = fixture();
  input.humanApproval.migrations[0].sha256 = '3'.repeat(64);
  assert.throws(() => verifyForwardProductionAcceptance(input), /human-reviewed migration bytes differ/);
});

test('rejects any post-promotion migration ledger drift', () => {
  const input = fixture();
  input.liveRemoteVersions.push('20260818000000');
  assert.throws(() => verifyForwardProductionAcceptance(input), /post-promotion migration drift detected/);
});

test('rejects recovery evidence captured from a different migration ledger', () => {
  const input = fixture();
  input.backupRestore.integrity.sourceMigrationLedger.sha256 = `sha256:${'f'.repeat(64)}`;
  assert.throws(() => verifyForwardProductionAcceptance(input), /source migration ledger digest differs from promoted ledger/);
});

test('rejects writable or failed live tenant evidence', () => {
  const writable = fixture();
  writable.liveTenantProof.readOnly = false;
  assert.throws(() => verifyForwardProductionAcceptance(writable), /must be read-only/);

  const leaked = fixture();
  leaked.liveTenantProof.checks.actorAForeignOrganizationHidden = false;
  assert.throws(() => verifyForwardProductionAcceptance(leaked), /actorAForeignOrganizationHidden must pass/);
});

test('rejects live postcondition selection-digest drift', () => {
  const input = fixture();
  input.livePostconditions.selectionDigest = `sha256:${'c'.repeat(64)}`;
  assert.throws(() => verifyForwardProductionAcceptance(input), /live postconditions selection digest mismatch/);
});

test('rejects backup restore evidence from another SHA or workflow run', () => {
  const wrongSha = fixture();
  wrongSha.backupRestore.targetSha = 'd'.repeat(40);
  assert.throws(() => verifyForwardProductionAcceptance(wrongSha), /backup\/restore exact-SHA binding is invalid/);

  const wrongRun = fixture();
  wrongRun.backupRestore.runId = '99999';
  assert.throws(() => verifyForwardProductionAcceptance(wrongRun), /backup\/restore run ID mismatch/);
});

test('rejects any migration repair or unrestricted-push evidence', () => {
  const repaired = fixture();
  repaired.promotionTransition.checks.migrationHistoryRepairPerformed = true;
  assert.throws(() => verifyForwardProductionAcceptance(repaired), /migration-history repair/);

  const unrestricted = fixture();
  unrestricted.promotionTransition.checks.unrestrictedDbPushPerformed = true;
  assert.throws(() => verifyForwardProductionAcceptance(unrestricted), /unrestricted db push/);
});
