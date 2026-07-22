import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEvidenceDocument } from '../../scripts/compliance/validate-enterprise-evidence-closure.mjs';

const policy = {
  humanReviewStatus: 'accepted',
  runtimeStatus: 'passed',
  maxRuntimeAgeDays: 90,
  requireIntegrityDigest: true,
};
const exactSha = 'a'.repeat(40);
const digest = 'b'.repeat(64);

test('runtime evidence accepts a complete exact-SHA package', () => {
  const document = {
    status: 'passed', exactSha, recordedAt: '2026-07-20T00:00:00.000Z',
    environment: 'isolated-production-like', proofType: 'two-tenant',
    assertions: [{ id: 'tenant-isolation', status: 'passed' }], integrity: { sha256: digest },
  };
  assert.deepEqual(validateEvidenceDocument(document, { kind: 'runtime' }, policy, {
    expectedSha: exactSha, now: new Date('2026-07-22T00:00:00.000Z'), raw: JSON.stringify(document),
  }), []);
});

test('runtime evidence fails closed on placeholders, stale proof and SHA mismatch', () => {
  const document = {
    status: 'passed', exactSha: 'c'.repeat(40), recordedAt: '2025-01-01T00:00:00.000Z',
    environment: 'production-like', proofType: 'TODO', assertions: [], integrity: { sha256: digest },
  };
  const failures = validateEvidenceDocument(document, { kind: 'runtime' }, policy, {
    expectedSha: exactSha, now: new Date('2026-07-22T00:00:00.000Z'), raw: JSON.stringify(document),
  });
  assert.ok(failures.includes('placeholder_content_forbidden'));
  assert.ok(failures.includes('exact_sha_mismatch'));
  assert.ok(failures.includes('runtime_evidence_stale'));
  assert.ok(failures.includes('runtime_assertions_missing'));
});

test('human review requires named qualification, scope and conclusion', () => {
  const document = {
    status: 'accepted', exactSha, reviewedAt: '2026-07-21T00:00:00.000Z',
    reviewer: { name: '', qualification: '' }, integrity: { sha256: digest },
  };
  const failures = validateEvidenceDocument(document, { kind: 'human_review' }, policy, {
    expectedSha: exactSha, raw: JSON.stringify(document),
  });
  assert.ok(failures.includes('reviewer_qualification_missing'));
  assert.ok(failures.includes('review_scope_or_conclusion_missing'));
});
