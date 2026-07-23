import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildHandoff, validateOperationsRegistry } from '../../scripts/compliance/generate-qualified-review-handoff.mjs';

const campaign = JSON.parse(readFileSync('docs/compliance/evidence/qualified-review-campaign-registry.json', 'utf8'));
const operations = JSON.parse(readFileSync('docs/compliance/evidence/qualified-review-operations-registry.json', 'utf8'));
const TARGET_SHA = 'a'.repeat(40);

describe('qualified review operations handoff', () => {
  it('covers all eight requirements and exactly 51 weighted points', () => {
    assert.deepEqual(validateOperationsRegistry(operations, campaign), []);
    const handoff = buildHandoff({ registry: operations, campaign, targetSha: TARGET_SHA, generatedAt: '2026-07-23T00:00:00.000Z' });
    assert.equal(handoff.reviews.length, 8);
    assert.equal(handoff.summary.totalWeight, 51);
    assert.equal(handoff.summary.remainingWeight, 51);
    assert.equal(handoff.summary.acceptedWeight, 0);
    assert.equal(handoff.summary.decision, 'QUALIFIED_REVIEW_OPERATIONS_NO_GO');
  });

  it('binds every pack to the exact assessed SHA and a deterministic digest', () => {
    const first = buildHandoff({ registry: operations, campaign, targetSha: TARGET_SHA, generatedAt: '2026-07-23T00:00:00.000Z' });
    const second = buildHandoff({ registry: operations, campaign, targetSha: TARGET_SHA, generatedAt: '2026-07-23T00:00:00.000Z' });
    assert.deepEqual(first, second);
    for (const review of first.reviews) {
      assert.equal(review.targetSha, TARGET_SHA);
      assert.match(review.integrity.sha256, /^[a-f0-9]{64}$/);
      assert.equal(review.independenceRequired, true);
      assert.ok(review.requiredOutputs.includes('conflict-of-interest declaration'));
    }
  });

  it('fails closed when an ACCEPTED status is committed without validated evidence', () => {
    const unsafe = structuredClone(operations);
    unsafe.reviews[0].status = 'ACCEPTED';
    assert.ok(validateOperationsRegistry(unsafe, campaign).some((failure) => failure.includes('cannot be committed')));
  });

  it('rejects campaign drift and incomplete reviewer coverage', () => {
    const drifted = structuredClone(operations);
    drifted.reviews[0].weight = 99;
    assert.ok(validateOperationsRegistry(drifted, campaign).some((failure) => failure.includes('campaign mismatch')));
    const incomplete = structuredClone(operations);
    incomplete.reviews.pop();
    assert.ok(validateOperationsRegistry(incomplete, campaign).some((failure) => failure.includes('cover all')));
  });
});
