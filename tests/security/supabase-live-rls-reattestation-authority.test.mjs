import assert from 'node:assert/strict';
import test from 'node:test';

import { validateSupabaseLiveReattestationSource } from '../../scripts/security/validate-supabase-live-reattestation-source.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = '24680';

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
  const result = validateSupabaseLiveReattestationSource(validEvidence(), { expectedSha: SHA, expectedRunId: RUN_ID });
  assert.equal(result.status, 'Complete');
  assert.equal(result.outcome, 'passed');
  assert.equal(result.authorityMode, 'read_only_reattestation');
  assert.equal(result.targetSha, SHA);
});

test('rejects a different release SHA', () => {
  const evidence = validEvidence();
  evidence.targetSha = 'd'.repeat(40);
  assert.throws(() => validateSupabaseLiveReattestationSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID }), /target SHA mismatch/);
});

test('rejects migration drift or missing recovery proof', () => {
  const drift = validEvidence();
  drift.checks.migrationDriftSinceBaselineAbsent = false;
  assert.throws(() => validateSupabaseLiveReattestationSource(drift, { expectedSha: SHA, expectedRunId: RUN_ID }), /migrationDriftSinceBaselineAbsent/);

  const recovery = validEvidence();
  recovery.recoveryBoundary.backupRestoreProven = false;
  assert.throws(() => validateSupabaseLiveReattestationSource(recovery, { expectedSha: SHA, expectedRunId: RUN_ID }), /backup\/restore boundary/);
});

test('rejects any Production mutation, migration repair, or unrestricted db push', () => {
  for (const field of ['productionMutationPerformedByReattestation', 'migrationHistoryRepairPerformed', 'unrestrictedDbPushPerformed']) {
    const evidence = validEvidence();
    evidence.checks[field] = true;
    assert.throws(() => validateSupabaseLiveReattestationSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID }), new RegExp(field));
  }
});

test('rejects retained sensitive evidence', () => {
  const evidence = validEvidence();
  evidence.evidenceIntegrity.databaseUrlsStored = true;
  assert.throws(() => validateSupabaseLiveReattestationSource(evidence, { expectedSha: SHA, expectedRunId: RUN_ID }), /databaseUrlsStored/);
});
