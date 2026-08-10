import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { buildOwnerReviewLedger } from './build-migration-owner-review-ledger.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');

const files = [
  ['20260101000000_alpha.sql', 'create table public.alpha(id uuid);'],
  ['20260101000100_beta.sql', 'create table public.beta(id uuid);'],
  ['20260101000200_gamma.sql', 'create table public.gamma(id uuid);'],
  ['20260101000300_delta.sql', 'create table public.delta(id uuid);'],
];

const inventory = {
  schema: 'risck-comply.supabase-migration-reconciliation-inventory.v1',
  generatedAt: '2026-08-10T00:00:00.000Z',
  items: files.map(([filename, sql]) => ({
    version: filename.slice(0, 14),
    filename,
    sha256: digest(sql),
    classificationReasons: ['LOCAL_ONLY_VERSION'],
  })),
};

const inventorySha256 = digest(JSON.stringify(inventory));
const subjectSha = 'a'.repeat(40);

function record(
  index,
  classification = 'PENDING_DEPLOYMENT',
  sourceEvidencePath = `docs/security/evidence/human-review/batch-${index}.md`,
) {
  const item = inventory.items[index];
  return {
    filename: item.filename,
    sha256: item.sha256,
    classification,
    sourceEvidencePath,
    reviewer: 'Repository Owner',
    reviewerRole: 'Repository owner / human classification reviewer',
    reviewedAt: '2026-08-10T18:00:00.000Z',
  };
}

function reviews(overrides = {}) {
  return {
    schema: 'risck-comply.supabase-migration-owner-review-records.v1',
    subjectSha,
    inventorySha256,
    records: [],
    unresolvedCredits: [],
    ...overrides,
  };
}

describe('Supabase migration owner-review ledger', () => {
  it('deduplicates exact reaffirmations instead of inflating the numerator', () => {
    const first = record(0, 'PENDING_DEPLOYMENT', 'docs/review-a.md');
    const reaffirmed = record(0, 'PENDING_DEPLOYMENT', 'docs/review-b.md');

    const result = buildOwnerReviewLedger({
      inventory,
      inventorySha256,
      reviews: reviews({ records: [first, reaffirmed] }),
      batchSize: 2,
    });

    assert.equal(result.status, 'READY_FOR_NEXT_HUMAN_REVIEW_BATCH');
    assert.equal(result.counts.uniqueExactReviewed, 1);
    assert.equal(result.counts.reaffirmations, 1);
    assert.equal(result.counts.documentedReviewedTotal, 1);
    assert.equal(result.nextHumanReviewBatch.length, 2);
    assert.equal(result.nextHumanReviewBatch[0].decision, null);
    assert.equal(result.safety.automaticClassificationAllowed, false);
  });

  it('fails closed on conflicting classifications for the same immutable file', () => {
    const first = record(0, 'PENDING_DEPLOYMENT', 'docs/review-a.md');
    const conflict = record(0, 'SUPERSEDED', 'docs/review-b.md');

    const result = buildOwnerReviewLedger({
      inventory,
      inventorySha256,
      reviews: reviews({ records: [first, conflict] }),
    });

    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.blockers.includes(
      `conflicting owner review records: ${inventory.items[0].filename}`,
    ));
    assert.equal(result.safety.nextBatchSelectionAuthorized, false);
    assert.deepEqual(result.nextHumanReviewBatch, []);
  });

  it('fails closed on unknown filenames and SQL digest mismatch', () => {
    const unknown = {
      ...record(0),
      filename: '20260101999999_unknown.sql',
    };
    const mismatched = {
      ...record(1),
      sha256: 'f'.repeat(64),
    };

    const result = buildOwnerReviewLedger({
      inventory,
      inventorySha256,
      reviews: reviews({ records: [unknown, mismatched] }),
    });

    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.blockers.includes(
      'review record not present in inventory: 20260101999999_unknown.sql',
    ));
    assert.ok(result.blockers.includes(
      `review record digest mismatch: ${inventory.items[1].filename}`,
    ));
  });

  it('withholds the next batch while opaque historical credits remain', () => {
    const result = buildOwnerReviewLedger({
      inventory,
      inventorySha256,
      reviews: reviews({
        records: [record(0)],
        unresolvedCredits: [{
          sourceLabel: 'Mega Batch E',
          count: 2,
          reason: 'Historical credit exists but exact immutable filenames were not reconstructed.',
        }],
        expectedDocumentedReviewedTotal: 3,
      }),
    });

    assert.equal(result.status, 'PROVENANCE_RECONSTRUCTION_REQUIRED');
    assert.equal(result.counts.uniqueExactReviewed, 1);
    assert.equal(result.counts.unresolvedCredits, 2);
    assert.equal(result.counts.documentedReviewedTotal, 3);
    assert.equal(result.counts.documentedRemaining, 1);
    assert.equal(result.counts.exactUnmatchedItems, 3);
    assert.deepEqual(result.nextHumanReviewBatch, []);
    assert.equal(result.safety.nextBatchSelectionAuthorized, false);
    assert.equal(result.safety.stagingExecutionAuthorized, false);
    assert.equal(result.safety.productionWriteAuthorized, false);
  });

  it('emits a bounded non-crediting next batch only after provenance is exact', () => {
    const result = buildOwnerReviewLedger({
      inventory,
      inventorySha256,
      reviews: reviews({
        records: [record(0), record(1)],
        expectedDocumentedReviewedTotal: 2,
      }),
      batchSize: 1,
    });

    assert.equal(result.status, 'READY_FOR_NEXT_HUMAN_REVIEW_BATCH');
    assert.equal(result.counts.uniqueExactReviewed, 2);
    assert.equal(result.counts.unresolvedCredits, 0);
    assert.deepEqual(result.nextHumanReviewBatch, [{
      version: inventory.items[2].version,
      filename: inventory.items[2].filename,
      sha256: inventory.items[2].sha256,
      classificationReasons: ['LOCAL_ONLY_VERSION'],
      decision: null,
      reviewer: null,
      reviewedAt: null,
    }]);
    assert.equal(result.safety.nextBatchSelectionAuthorized, true);
    assert.equal(result.safety.automaticClassificationAllowed, false);
    assert.equal(result.safety.canonicalDecisionAccepted, false);
  });
});
