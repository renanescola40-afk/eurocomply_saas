import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPromotion, sha256, validateRestoreEvidence } from '../../scripts/operations/validate-restore-drill-evidence.mjs';

const sha = 'a'.repeat(40);

function validEvidence() {
  return {
    schemaVersion: 1,
    sourceSha: sha,
    environment: 'production-restore-drill',
    startedAt: '2026-07-28T09:00:00.000Z',
    completedAt: '2026-07-28T09:27:00.000Z',
    rpoMinutes: 5,
    rtoMinutes: 27,
    backupIdHash: sha256('backup-2026-07-28'),
    restoreTargetHash: sha256('isolated-restore-target'),
    restoreTargetIsIsolated: true,
    productionMutationPerformed: false,
    checks: {
      backupAvailable: true,
      restoreCompleted: true,
      schemaVerified: true,
      migrationHistoryVerified: true,
      rlsVerified: true,
      tenantIsolationVerified: true,
      criticalCountsVerified: true,
      authBoundaryVerified: true,
      applicationSmokeVerified: true,
      cleanupVerified: true,
    },
    operator: { role: 'database-operator' },
    approval: {
      status: 'approved',
      approverRole: 'security-reviewer',
      independentFromOperator: true,
    },
    notes: 'Sanitized restore drill completed against an isolated target.',
  };
}

test('accepts complete exact-SHA sanitized restore evidence', () => {
  const result = validateRestoreEvidence(validEvidence(), sha);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('rejects stale SHA and incomplete controls', () => {
  const evidence = validEvidence();
  evidence.sourceSha = 'b'.repeat(40);
  evidence.checks.rlsVerified = false;
  const result = validateRestoreEvidence(evidence, sha);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /EXPECTED_MAIN_SHA/);
  assert.match(result.errors.join('\n'), /rlsVerified/);
});

test('rejects sensitive keys and provider credentials', () => {
  const evidence = validEvidence();
  evidence.databaseUrl = 'postgresql://user:password@example.invalid/db';
  const result = validateRestoreEvidence(evidence, sha);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /sensitive data rejected/);
});

test('rejects non-isolated or production-mutating drills', () => {
  const evidence = validEvidence();
  evidence.restoreTargetIsIsolated = false;
  evidence.productionMutationPerformed = true;
  const result = validateRestoreEvidence(evidence, sha);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /isolated/);
  assert.match(result.errors.join('\n'), /productionMutationPerformed/);
});

test('promotion is Complete only after validation and contains integrity digest', () => {
  const evidence = validEvidence();
  assert.equal(validateRestoreEvidence(evidence, sha).ok, true);
  const promotion = buildPromotion(evidence);
  assert.equal(promotion.status, 'Complete');
  assert.equal(promotion.outcome, 'passed');
  assert.match(promotion.evidenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(promotion.sourceSha, sha);
  assert.equal(promotion.controls.length, 10);
});
