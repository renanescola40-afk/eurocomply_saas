import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyForwardHumanApproval } from './verify-forward-human-approval.mjs';

const targetSha = 'a'.repeat(40);
const subjectSha = 'b'.repeat(40);
const digestA = '1'.repeat(64);
const digestB = '2'.repeat(64);

function fixture() {
  const pending = [
    {
      filename: '20260817000000_first.sql',
      sha256: digestA,
      classification: 'PENDING_DEPLOYMENT',
      deployOrderDecision: 1,
      schemaEvidenceReference: 'evidence:first',
      rollbackReference: 'rollback:first',
      reviewer: 'reviewer-one',
      reviewerRole: 'DB reviewer',
      reviewedAt: '2026-08-18T12:00:00Z',
    },
    {
      filename: '20260817000001_second.sql',
      sha256: digestB,
      classification: 'PENDING_DEPLOYMENT',
      deployOrderDecision: 2,
      schemaEvidenceReference: 'evidence:second',
      rollbackReference: 'rollback:second',
      reviewer: 'reviewer-two',
      reviewerRole: 'Security reviewer',
      reviewedAt: '2026-08-18T12:05:00Z',
    },
  ];
  return {
    manifest: {
      schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
      targetSha,
      selectionDigest: `sha256:${'3'.repeat(64)}`,
      migrations: [
        { version: '20260817000000', filename: pending[0].filename, sha256: digestA },
        { version: '20260817000001', filename: pending[1].filename, sha256: digestB },
      ],
    },
    decisionResult: {
      schema: 'risck-comply.supabase-migration-reconciliation-decision-result.v1',
      accepted: true,
      decisionStatus: 'RECONCILIATION_ACCEPTED_FOR_STAGING',
      deploymentAuthorization: 'NOT_AUTHORIZED',
      releaseSha: subjectSha,
      plans: { pendingDeployment: pending },
    },
    pendingDeploymentPlan: pending,
  };
}

test('accepts exact selected bytes only when human decision coverage is complete', () => {
  const proof = verifyForwardHumanApproval({
    ...fixture(),
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  });
  assert.equal(proof.status, 'Complete');
  assert.equal(proof.outcome, 'passed');
  assert.equal(proof.selectedMigrationCount, 2);
  assert.equal(proof.checks.productionWriteAuthorizedByDecisionGate, false);
  assert.equal(proof.evidenceIntegrity.humanNamesStored, false);
});

test('rejects a selected migration that lacks human PENDING_DEPLOYMENT classification', () => {
  const input = fixture();
  input.decisionResult.plans.pendingDeployment = input.decisionResult.plans.pendingDeployment.slice(0, 1);
  assert.throws(() => verifyForwardHumanApproval({
    ...input,
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  }), /lacks accepted PENDING_DEPLOYMENT human decision/);
});

test('rejects byte drift between human decision and selected manifest', () => {
  const input = fixture();
  input.manifest.migrations[0].sha256 = '4'.repeat(64);
  assert.throws(() => verifyForwardHumanApproval({
    ...input,
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  }), /lacks accepted PENDING_DEPLOYMENT human decision/);
});

test('rejects non-accepted decision gate output and self-authorizing decision artifacts', () => {
  const rejected = fixture();
  rejected.decisionResult.accepted = false;
  assert.throws(() => verifyForwardHumanApproval({
    ...rejected,
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  }), /not accepted/);

  const selfAuthorizing = fixture();
  selfAuthorizing.decisionResult.deploymentAuthorization = 'AUTHORIZED';
  assert.throws(() => verifyForwardHumanApproval({
    ...selfAuthorizing,
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  }), /must not itself authorize deployment/);
});

test('rejects subject, evidence and run provenance shape mismatches', () => {
  assert.throws(() => verifyForwardHumanApproval({
    ...fixture(),
    targetSha,
    decisionSubjectSha: 'bad',
    decisionRunId: '12345',
    evidenceCommitSha: targetSha,
  }), /subject SHA is invalid/);

  assert.throws(() => verifyForwardHumanApproval({
    ...fixture(),
    targetSha,
    decisionSubjectSha: subjectSha,
    decisionRunId: 'not-a-run',
    evidenceCommitSha: targetSha,
  }), /decision run ID is invalid/);
});
