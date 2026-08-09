import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_MIGRATION_EVIDENCE_PATHS,
  validateMigrationEvidenceLineage,
} from './validate-migration-evidence-lineage.mjs';

const subjectSha = 'a'.repeat(40);
const currentSha = 'b'.repeat(40);

test('template generation requires the subject to still be current main', () => {
  assert.equal(validateMigrationEvidenceLineage({ subjectSha, currentSha: subjectSha, mode: 'template', changedPaths: [] }).accepted, true);
  const moved = validateMigrationEvidenceLineage({ subjectSha, currentSha, mode: 'template', changedPaths: [] });
  assert.equal(moved.accepted, false);
  assert.ok(moved.failures.includes('template_requires_subject_to_be_current_main'));
});

test('decision and execution lineage permit only the canonical decisions file', () => {
  for (const mode of ['decision', 'execution']) {
    const result = validateMigrationEvidenceLineage({
      subjectSha,
      currentSha,
      mode,
      changedPaths: [CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions],
    });
    assert.equal(result.accepted, true);
  }
});

test('application, migration and workflow changes fail closed', () => {
  for (const path of [
    'src/app/api/example/route.ts',
    'supabase/migrations/20260101000000_change.sql',
    '.github/workflows/ci.yml',
  ]) {
    const result = validateMigrationEvidenceLineage({
      subjectSha,
      currentSha,
      mode: 'production',
      changedPaths: [CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions, path],
    });
    assert.equal(result.accepted, false);
    assert.ok(result.failures.includes(`non_evidence_change:${path}`));
  }
});

test('staging permits only decisions plus the canonical rehearsal result', () => {
  const accepted = validateMigrationEvidenceLineage({
    subjectSha,
    currentSha,
    mode: 'staging',
    changedPaths: [
      CANONICAL_MIGRATION_EVIDENCE_PATHS.decisions,
      CANONICAL_MIGRATION_EVIDENCE_PATHS.stagingResult,
    ],
  });
  assert.equal(accepted.accepted, true);
  const rejected = validateMigrationEvidenceLineage({
    subjectSha,
    currentSha,
    mode: 'staging',
    changedPaths: [CANONICAL_MIGRATION_EVIDENCE_PATHS.productionRequest],
  });
  assert.equal(rejected.accepted, false);
});

test('production permits the three canonical migration evidence documents', () => {
  const result = validateMigrationEvidenceLineage({
    subjectSha,
    currentSha,
    mode: 'production',
    changedPaths: Object.values(CANONICAL_MIGRATION_EVIDENCE_PATHS),
  });
  assert.equal(result.accepted, true);
});

test('malformed SHA and unknown modes fail closed', () => {
  assert.equal(validateMigrationEvidenceLineage({ subjectSha: 'bad', currentSha, mode: 'decision', changedPaths: [] }).accepted, false);
  assert.equal(validateMigrationEvidenceLineage({ subjectSha, currentSha, mode: 'unknown', changedPaths: [] }).accepted, false);
});
