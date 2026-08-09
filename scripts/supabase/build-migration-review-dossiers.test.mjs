import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDossiers } from './build-migration-review-dossiers.mjs';

const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const releaseSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const inventory = {
  schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
  items: [{
    filename: '20260101000000_example.sql',
    version: '20260101000000',
    sha256: sha,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
  }],
};

const currentEvidence = {
  schema: 'risck-comply.supabase-migration-object-evidence.v1',
  source: {
    targetSha: releaseSha,
    dryRunId: '123',
    schemaEvidenceRunId: '456',
  },
  items: [{
    filename: '20260101000000_example.sql',
    version: '20260101000000',
    sha256: sha,
    duplicateVersion: false,
    classificationReasons: ['LOCAL_ONLY_VERSION'],
    objectProofDigest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    operations: [{
      kind: 'TABLE',
      action: 'CREATE',
      key: 'public.example',
      expectedState: 'PRESENT',
      observedState: 'PRESENT',
      targetStateMatched: true,
      statementSha256: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    }],
    unresolved: [],
    candidate: {
      objectState: 'TARGET_STATE_PRESENT',
      candidateClassification: 'ALREADY_PRESENT_IN_SCHEMA',
      confidence: 'HIGH',
      rationale: '1/1 parsed object target states match the production catalog.',
      matchedOperations: 1,
      unmatchedOperations: 0,
      unresolvedStatements: 0,
      humanDecisionRequired: true,
      automaticClassificationAllowed: false,
    },
  }],
  acceptedDecisions: 0,
};

function build(overrides = {}) {
  const selectedInventory = overrides.inventory ?? inventory;
  const selectedEvidence = overrides.evidence ?? currentEvidence;
  return buildDossiers({
    inventory: selectedInventory,
    inventoryBytes: Buffer.from(JSON.stringify(selectedInventory)),
    evidence: selectedEvidence,
    evidenceBytes: Buffer.from(JSON.stringify(selectedEvidence)),
    releaseSha: overrides.releaseSha ?? releaseSha,
  });
}

test('consumes the current object-evidence items contract without automatic migration credit', () => {
  const dossier = build().dossiers[0];
  assert.equal(dossier.targetStateMatchedCount, 1);
  assert.equal(dossier.targetStateUnmatchedCount, 0);
  assert.equal(dossier.allTargetStatesMatched, true);
  assert.equal(dossier.candidate.classification, 'ALREADY_PRESENT_IN_SCHEMA');
  assert.equal(dossier.evidenceAssessment.supportsAlreadyPresentReview, true);
  assert.equal(dossier.evidenceAssessment.provesMigrationApplied, false);
  assert.equal(dossier.evidenceAssessment.candidateEvidenceIsApproval, false);
  assert.equal(dossier.automaticClassification, null);
  assert.equal(dossier.reviewRequired, true);
});

test('legacy invalid migration still receives a dossier instead of disappearing from evidence', () => {
  const legacyFilename = '20260605_compliance_evidence.sql';
  const legacyInventory = {
    ...inventory,
    items: [{
      ...inventory.items[0],
      filename: legacyFilename,
      version: null,
      classificationReasons: ['INVALID_LOCAL_FILENAME_OR_TIMESTAMP', 'DUPLICATE_VERSION'],
    }],
  };
  const legacyEvidence = {
    ...currentEvidence,
    items: [{
      ...currentEvidence.items[0],
      filename: legacyFilename,
      version: null,
      classificationReasons: ['INVALID_LOCAL_FILENAME_OR_TIMESTAMP', 'DUPLICATE_VERSION'],
      duplicateVersion: true,
      operations: [],
      unresolved: [{
        reason: 'STATEMENT_NOT_DETERMINISTICALLY_PARSED',
        statementSha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      }],
      candidate: {
        ...currentEvidence.items[0].candidate,
        objectState: 'UNPROVABLE',
        candidateClassification: 'REQUIRES_SPLIT_REVIEW',
        confidence: 'LOW',
        matchedOperations: 0,
        unmatchedOperations: 0,
        unresolvedStatements: 1,
      },
    }],
  };
  const dossier = build({ inventory: legacyInventory, evidence: legacyEvidence }).dossiers[0];
  assert.equal(dossier.filename, legacyFilename);
  assert.equal(dossier.candidate.classification, 'REQUIRES_SPLIT_REVIEW');
  assert.equal(dossier.unresolvedStatementCount, 1);
  assert.equal(dossier.reviewRequired, true);
});

test('missing current object evidence fails closed', () => {
  assert.throws(
    () => build({ evidence: { ...currentEvidence, items: [] } }),
    /object evidence items must be a non-empty array/,
  );
});

test('digest mismatch fails closed', () => {
  const changed = {
    ...currentEvidence,
    items: [{ ...currentEvidence.items[0], sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' }],
  };
  assert.throws(() => build({ evidence: changed }), /evidence digest mismatch/);
});

test('evidence from another release SHA fails closed', () => {
  const changed = {
    ...currentEvidence,
    source: { ...currentEvidence.source, targetSha: 'cccccccccccccccccccccccccccccccccccccccc' },
  };
  assert.throws(() => build({ evidence: changed }), /object evidence release SHA mismatch/);
});

test('inventory and object-evidence cardinality must match', () => {
  const changed = {
    ...currentEvidence,
    items: [
      currentEvidence.items[0],
      { ...currentEvidence.items[0], filename: '20260102000000_extra.sql' },
    ],
  };
  assert.throws(() => build({ evidence: changed }), /inventory\/object evidence item count mismatch/);
});
