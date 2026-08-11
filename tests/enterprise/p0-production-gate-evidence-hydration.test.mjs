import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evidenceCommitSha,
  selectEvidenceZipEntry,
  selectProductionGateRuns,
  validateProductionGateP0Evidence,
} from '../../scripts/enterprise/fetch-production-gate-p0-evidence.mjs';

const SHA = 'a'.repeat(40);
const WORKFLOW_PATH = '.github/workflows/enterprise-production-gate.yml';

test('selectProductionGateRuns keeps completed exact-main-SHA canonical workflow runs newest first', () => {
  const runs = selectProductionGateRuns([
    { id: 1, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-08-11T10:00:00Z' },
    { id: 2, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-11T11:00:00Z' },
    { id: 3, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-08-11T12:00:00Z' },
    { id: 4, path: '.github/workflows/other.yml', head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-11T13:00:00Z' },
    { id: 5, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'in_progress', conclusion: null, updated_at: '2026-08-11T14:00:00Z' },
  ], SHA);

  assert.deepEqual(runs.map((run) => run.id), [2, 1]);
});

test('selectEvidenceZipEntry accepts one canonical nested path and rejects ambiguity or traversal', () => {
  const expected = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
  assert.equal(
    selectEvidenceZipEntry([`bundle/${expected}`, 'release-validation/summary.json'], expected),
    `bundle/${expected}`,
  );
  assert.throws(
    () => selectEvidenceZipEntry([expected, `other/${expected}`], expected),
    /evidence_entry_ambiguous/,
  );
  assert.throws(
    () => selectEvidenceZipEntry(['../escape.json'], expected),
    /artifact_zip_unsafe_entry/,
  );
});

test('evidenceCommitSha prefers runtime provenance and normalizes case', () => {
  assert.equal(evidenceCommitSha({ runtimeContext: { commitSha: SHA.toUpperCase() }, commitSha: 'b'.repeat(40) }), SHA);
});

test('P0 production-gate hydration requires exact SHA independently of the canonical validator', () => {
  const spec = { validator: () => [] };
  assert.deepEqual(
    validateProductionGateP0Evidence({ runtimeContext: { commitSha: SHA }, evidenceIntegrity: { containsSensitiveValues: false } }, spec, { targetSha: SHA }),
    [],
  );
  assert.deepEqual(
    validateProductionGateP0Evidence({ runtimeContext: { commitSha: 'b'.repeat(40) }, evidenceIntegrity: { containsSensitiveValues: false } }, spec, { targetSha: SHA }),
    ['evidence_exact_sha_mismatch'],
  );
});

test('P0 production-gate hydration rejects evidence explicitly marked sensitive', () => {
  const spec = { validator: () => [] };
  assert.deepEqual(
    validateProductionGateP0Evidence({ runtimeContext: { commitSha: SHA }, evidenceIntegrity: { containsSensitiveValues: true } }, spec, { targetSha: SHA }),
    ['evidence_contains_sensitive_values'],
  );
});
