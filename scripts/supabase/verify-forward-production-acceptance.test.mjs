import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyForwardProductionAcceptance } from './verify-forward-production-acceptance.mjs';

const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;

function fixture() {
  return {
    humanApproval: {
      schema: 'risck-comply.supabase-forward-human-approval-proof.v1',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest: digest,
      selectedMigrationCount: 25,
      decisionRunId: '1234',
      decisionSubjectSha: 'c'.repeat(40),
      checks: {
        acceptedHumanDecisionGate: true,
        everySelectedMigrationPendingDeployment: true,
        exactSelectedBytesCovered: true,
        productionWriteAuthorizedByDecisionGate: false,
      },
    },
    promotionTransition: {
      schema: 'risck-comply.supabase-forward-reconciliation-promotion.v1',
      status: 'Complete',
      outcome: 'passed',
      targetSha: sha,
      selectionDigest: digest,
      selectedMigrationCount: 25,
      checks: {
        remoteAfterEqualsBeforePlusSelected: true,
        appliedSetEqualsSelectedSet: true,
        unauthorizedMigrationApplied: false,
        migrationHistoryRepairPerformed: false,
        unrestrictedDbPushPerformed: false,
      },
    },
    livePostconditions: {
      status: 'PASS',
      readOnly: true,
      postconditions: 'forward_reconciliation_postconditions_passed',
      targetSha: sha,
      selectionDigest: digest,
    },
  };
}

test('accepts only one exact SHA and selection digest across human, ledger and live proofs', () => {
  const evidence = verifyForwardProductionAcceptance({ ...fixture(), releaseSha: sha });
  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.selectedMigrationCount, 25);
  assert.equal(evidence.checks.exactHumanReviewedBytesPromoted, true);
  assert.equal(evidence.checks.liveSchemaSecurityPostconditionsPassed, true);
  assert.equal(evidence.evidenceIntegrity.humanNamesStored, false);
});

test('rejects human proof that tries to self-authorize production', () => {
  const input = fixture();
  input.humanApproval.checks.productionWriteAuthorizedByDecisionGate = true;
  assert.throws(() => verifyForwardProductionAcceptance({ ...input, releaseSha: sha }), /must remain non-authorizing/);
});

test('rejects ledger selection digest drift', () => {
  const input = fixture();
  input.promotionTransition.selectionDigest = `sha256:${'d'.repeat(64)}`;
  assert.throws(() => verifyForwardProductionAcceptance({ ...input, releaseSha: sha }), /selection digest does not match human approval/);
});

test('rejects unauthorized migration or history repair evidence', () => {
  const unauthorized = fixture();
  unauthorized.promotionTransition.checks.unauthorizedMigrationApplied = true;
  assert.throws(() => verifyForwardProductionAcceptance({ ...unauthorized, releaseSha: sha }), /unauthorized migration was applied/);

  const repaired = fixture();
  repaired.promotionTransition.checks.migrationHistoryRepairPerformed = true;
  assert.throws(() => verifyForwardProductionAcceptance({ ...repaired, releaseSha: sha }), /history repair was performed/);
});

test('rejects missing read-only live postcondition binding', () => {
  const writable = fixture();
  writable.livePostconditions.readOnly = false;
  assert.throws(() => verifyForwardProductionAcceptance({ ...writable, releaseSha: sha }), /must be read-only/);

  const wrongSha = fixture();
  wrongSha.livePostconditions.targetSha = 'e'.repeat(40);
  assert.throws(() => verifyForwardProductionAcceptance({ ...wrongSha, releaseSha: sha }), /target SHA mismatch/);
});
