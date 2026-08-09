import assert from 'node:assert/strict';
import test from 'node:test';

import {
  approvalDigestFor,
  DECISIONS_SCHEMA,
  decisionDigestFor,
  sha256,
} from './validate-migration-reconciliation-decisions.mjs';
import { evaluateMigrationClassificationDecisions } from './validate-migration-classification-decisions.mjs';

const releaseSha = 'a'.repeat(40);
const migrationDigest = 'b'.repeat(64);
const inventory = {
  schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
  allowedClassifications: [
    'ALREADY_PRESENT_IN_SCHEMA',
    'PENDING_DEPLOYMENT',
    'SUPERSEDED',
    'ARCHIVE_LEGACY',
    'REQUIRES_SPLIT_REVIEW',
  ],
  items: [{
    filename: '20260101000000_pending.sql',
    version: '20260101000000',
    sha256: migrationDigest,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
  }],
};
const inventoryBytes = Buffer.from(JSON.stringify(inventory));
const inventorySha256 = sha256(inventoryBytes);

function sealedPending(overrides = {}) {
  const decision = {
    filename: inventory.items[0].filename,
    version: inventory.items[0].version,
    sha256: migrationDigest,
    classification: 'PENDING_DEPLOYMENT',
    rationale: 'Production catalog evidence shows the intended target state is absent and the migration requires protected staging rehearsal.',
    schemaEvidenceReference: 'artifact://live-schema/pending-target-absent',
    replacementMigrationDigest: null,
    stagedExecutionEvidenceReference: null,
    deployOrderDecision: 1,
    rollbackReference: 'runbook://rollback/pending-1',
    archivalMappingReference: null,
    splitReviewReference: null,
    reviewer: 'Renan Rodrigues Cerqueira da Silva',
    reviewerRole: 'Creator / owner reviewer',
    reviewedAt: '2026-08-09T09:00:00.000Z',
  };
  const selected = { ...decision, ...(overrides.decision ?? {}) };
  selected.decisionDigest = decisionDigestFor({ releaseSha, inventorySha256, decision: selected });
  const document = {
    schema: DECISIONS_SCHEMA,
    releaseSha,
    inventorySha256,
    status: 'REVIEWED',
    decisions: [selected],
    independentApprover: {
      name: 'Renan Escola40',
      role: 'Independent approver',
      approvedAt: '2026-08-09T09:30:00.000Z',
      approvalReference: 'github://approval/example',
    },
  };
  document.approvalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256,
    decisions: document.decisions,
    independentApprover: document.independentApprover,
  });
  return { ...document, ...(overrides.document ?? {}) };
}

test('accepts pending classification for staging without pretending staging already happened', () => {
  const result = evaluateMigrationClassificationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: sealedPending(),
    expectedReleaseSha: releaseSha,
    now: new Date('2026-08-09T10:00:00.000Z'),
  });
  assert.equal(result.accepted, true);
  assert.equal(result.decisionStatus, 'RECONCILIATION_ACCEPTED_FOR_STAGING');
  assert.equal(result.stagingRequired, true);
  assert.equal(result.safety.productionWriteAuthorized, false);
  assert.equal(result.safety.stagingEvidenceRequiredBeforeProduction, true);
});

test('pending classification still requires exact schema evidence, order and rollback', () => {
  const document = sealedPending({ decision: { schemaEvidenceReference: null, deployOrderDecision: null, rollbackReference: null } });
  const result = evaluateMigrationClassificationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now: new Date('2026-08-09T10:00:00.000Z'),
  });
  assert.equal(result.accepted, false);
  assert.ok(result.failures.some((value) => value.includes('pending_schema_evidence_required')));
  assert.ok(result.failures.some((value) => value.includes('positive_deploy_order_required')));
  assert.ok(result.failures.some((value) => value.includes('rollback_reference_required')));
});

test('same reviewer and independent approver remains forbidden', () => {
  const document = sealedPending();
  document.independentApprover.name = document.decisions[0].reviewer;
  document.approvalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256,
    decisions: document.decisions,
    independentApprover: document.independentApprover,
  });
  const result = evaluateMigrationClassificationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now: new Date('2026-08-09T10:00:00.000Z'),
  });
  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('independent_approver_must_not_be_item_reviewer'));
});
