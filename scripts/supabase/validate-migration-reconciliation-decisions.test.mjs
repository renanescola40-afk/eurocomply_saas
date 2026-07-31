import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDecisionTemplate } from './generate-migration-reconciliation-decision-template.mjs';
import {
  approvalDigestFor,
  decisionDigestFor,
  evaluateMigrationReconciliationDecisions,
  sha256,
} from './validate-migration-reconciliation-decisions.mjs';

const releaseSha = 'a'.repeat(40);
const reviewedAt = '2026-07-31T09:00:00.000Z';
const now = new Date('2026-07-31T10:00:00.000Z');

function fixtureInventory() {
  return {
    schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
    generatedAt: '2026-07-31T08:00:00.000Z',
    allowedClassifications: [
      'ALREADY_PRESENT_IN_SCHEMA',
      'PENDING_DEPLOYMENT',
      'SUPERSEDED',
      'ARCHIVE_LEGACY',
      'REQUIRES_SPLIT_REVIEW',
    ],
    items: [
      {
        version: '20260101000000',
        filename: '20260101000000_present.sql',
        sha256: '1'.repeat(64),
        byteLength: 10,
        classificationReasons: ['LOCAL_ONLY_VERSION'],
      },
      {
        version: '20260102000000',
        filename: '20260102000000_pending.sql',
        sha256: '2'.repeat(64),
        byteLength: 20,
        classificationReasons: ['LOCAL_ONLY_VERSION'],
      },
      {
        version: '20260103000000',
        filename: '20260103000000_superseded.sql',
        sha256: '3'.repeat(64),
        byteLength: 30,
        classificationReasons: ['DUPLICATE_VERSION'],
      },
      {
        version: null,
        filename: 'legacy_invalid.sql',
        sha256: '4'.repeat(64),
        byteLength: 40,
        classificationReasons: ['INVALID_LOCAL_FILENAME_OR_TIMESTAMP'],
      },
    ],
  };
}

function acceptedDocument() {
  const inventory = fixtureInventory();
  const inventoryBytes = Buffer.from(JSON.stringify(inventory));
  const document = buildDecisionTemplate({ inventory, inventoryBytes, releaseSha });
  document.status = 'REVIEWED';

  Object.assign(document.decisions[0], {
    classification: 'ALREADY_PRESENT_IN_SCHEMA',
    rationale: 'The exact object definitions are present in the reviewed target schema dump.',
    schemaEvidenceReference: 'evidence/schema-dump#present',
    reviewer: 'Database Reviewer One',
    reviewerRole: 'Database engineer',
    reviewedAt,
  });
  Object.assign(document.decisions[1], {
    classification: 'PENDING_DEPLOYMENT',
    rationale: 'The migration is absent from the target and passed ordered staging execution.',
    stagedExecutionEvidenceReference: 'evidence/staging-run#pending',
    deployOrderDecision: 1,
    rollbackReference: 'runbooks/rollback#pending',
    reviewer: 'Database Reviewer Two',
    reviewerRole: 'Release engineer',
    reviewedAt,
  });
  Object.assign(document.decisions[2], {
    classification: 'SUPERSEDED',
    rationale: 'A later reviewed migration fully establishes the intended schema state.',
    replacementMigrationDigest: '5'.repeat(64),
    schemaEvidenceReference: 'evidence/schema-diff#superseded',
    reviewer: 'Database Reviewer Three',
    reviewerRole: 'Database engineer',
    reviewedAt,
  });
  Object.assign(document.decisions[3], {
    classification: 'ARCHIVE_LEGACY',
    rationale: 'The invalid legacy file is mapped to retained historical evidence and must never execute.',
    archivalMappingReference: 'docs/migrations/archive-map#legacy-invalid',
    schemaEvidenceReference: 'evidence/schema-dump#legacy-invalid',
    reviewer: 'Database Reviewer Four',
    reviewerRole: 'Security reviewer',
    reviewedAt,
  });

  for (const decision of document.decisions) {
    decision.decisionDigest = decisionDigestFor({
      releaseSha,
      inventorySha256: document.inventorySha256,
      decision,
    });
  }

  document.independentApprover = {
    name: 'Independent Release Approver',
    role: 'Release authority',
    approvedAt: reviewedAt,
    approvalReference: 'approvals/migration-reconciliation-2026-07-31',
  };
  document.approvalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256: document.inventorySha256,
    decisions: document.decisions,
    independentApprover: document.independentApprover,
  });

  return { inventory, inventoryBytes, document };
}

function reseal(document) {
  for (const decision of document.decisions) {
    decision.decisionDigest = decisionDigestFor({
      releaseSha,
      inventorySha256: document.inventorySha256,
      decision,
    });
  }
  document.approvalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256: document.inventorySha256,
    decisions: document.decisions,
    independentApprover: document.independentApprover,
  });
}

test('generates a non-crediting template bound to the inventory and release SHA', () => {
  const inventory = fixtureInventory();
  const inventoryBytes = Buffer.from(JSON.stringify(inventory));
  const template = buildDecisionTemplate({ inventory, inventoryBytes, releaseSha });

  assert.equal(template.status, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(template.releaseSha, releaseSha);
  assert.equal(template.inventorySha256, sha256(inventoryBytes));
  assert.equal(template.decisions.length, inventory.items.length);
  assert.ok(template.decisions.every((decision) => decision.classification === null));
  assert.equal(template.independentApprover, null);
});

test('accepts complete evidence-bound decisions without authorizing a production write', () => {
  const { inventory, inventoryBytes, document } = acceptedDocument();
  const result = evaluateMigrationReconciliationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now,
  });

  assert.equal(result.accepted, true);
  assert.equal(result.decisionStatus, 'RECONCILIATION_ACCEPTED');
  assert.equal(result.counts.acceptedDecisions, 4);
  assert.equal(result.plans.pendingDeployment[0].deployOrderDecision, 1);
  assert.equal(result.safety.productionWriteAuthorized, false);
  assert.equal(result.deploymentAuthorization, 'NOT_AUTHORIZED');
});

test('fails closed when a sealed decision is changed', () => {
  const { inventory, inventoryBytes, document } = acceptedDocument();
  document.decisions[0].rationale = 'Tampered after sealing';

  const result = evaluateMigrationReconciliationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now,
  });

  assert.equal(result.accepted, false);
  assert.ok(result.failures.includes('decisions[0].decision_digest_mismatch'));
});

test('fails closed when one inventory item has no decision', () => {
  const { inventory, inventoryBytes, document } = acceptedDocument();
  document.decisions.pop();
  reseal(document);

  const result = evaluateMigrationReconciliationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now,
  });

  assert.equal(result.accepted, false);
  assert.ok(result.failures.some((failure) => failure.startsWith('missing_decision:legacy_invalid.sql')));
  assert.ok(result.failures.includes('decision_count_mismatch'));
});

test('rejects duplicate pending deployment order numbers', () => {
  const { inventory, inventoryBytes, document } = acceptedDocument();
  Object.assign(document.decisions[3], {
    classification: 'PENDING_DEPLOYMENT',
    rationale: 'A second pending item with a conflicting order.',
    schemaEvidenceReference: null,
    archivalMappingReference: null,
    stagedExecutionEvidenceReference: 'evidence/staging-run#second',
    deployOrderDecision: 1,
    rollbackReference: 'runbooks/rollback#second',
  });
  reseal(document);

  const result = evaluateMigrationReconciliationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now,
  });

  assert.equal(result.accepted, false);
  assert.ok(result.failures.some((failure) => failure.includes('duplicate_deploy_order')));
});

test('keeps split-review classifications blocked even when correctly sealed', () => {
  const { inventory, inventoryBytes, document } = acceptedDocument();
  Object.assign(document.decisions[2], {
    classification: 'REQUIRES_SPLIT_REVIEW',
    rationale: 'The migration mixes independently reviewable destructive and additive statements.',
    replacementMigrationDigest: null,
    schemaEvidenceReference: null,
    splitReviewReference: 'issues/migration-split-review-20260103000000',
  });
  reseal(document);

  const result = evaluateMigrationReconciliationDecisions({
    inventory,
    inventoryBytes,
    decisionsDocument: document,
    expectedReleaseSha: releaseSha,
    now,
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('split_review_items_remain'));
  assert.equal(result.plans.splitReview.length, 1);
});
