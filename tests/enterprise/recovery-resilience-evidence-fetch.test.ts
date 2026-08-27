import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCanonicalRecoveryDrillEvidence,
  buildCanonicalRecoveryEvidence,
  buildCanonicalRollbackOnlyEvidence,
  removeStaleRecoveryEvidence,
  selectExactShaRecoveryDrillRun,
  selectExactShaRecoveryRun,
  selectRecoveryDrillEvidenceEntry,
  selectRollbackEvidenceEntry,
  validateBackupRestoreSource,
  validateRecoverySources,
  validateRollbackSource,
} from '../../scripts/enterprise/fetch-recovery-resilience-evidence.mjs';
import { evaluateEvidenceDocument } from '../../scripts/enterprise/generate-readiness-scorecard.mjs';

const targetSha = 'a'.repeat(40);
const rollbackRunId = '123456';
const restoreRunId = '654321';
const workflowPath = '.github/workflows/recovery-resilience-proof.yml';
const restoreWorkflowPath = '.github/workflows/supabase-forward-reconciliation-rehearsal.yml';
const validatorPath = join(process.cwd(), 'scripts/enterprise/check-recovery-scorecard-evidence.mjs');
const roots: string[] = [];

function rollbackSource() {
  return {
    schema: 'risck-comply.rollback-validation.v4', evidenceItem: 'rollback-validation',
    status: 'Complete', outcome: 'passed', generatedAt: '2026-08-26T20:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas', branch: 'main', targetSha, observedSha: targetSha, runId: rollbackRunId,
    controlsVerified: ['REC-01', 'REC-02', 'REC-03', 'REC-04'], failures: [],
    checks: {
      explicitConfirmation: true, rollbackTargetConfigured: true, rollbackTargetDistinct: true,
      rollbackShaDistinct: true, rollbackExecuted: true, rollbackStatusChecked: true,
      postRollbackHealth: true, postRollbackNoStore: true, protectedEnvironment: true, exactShaBound: true,
    },
    metrics: { recoveryTimeSeconds: 31 },
    evidenceIntegrity: { containsSensitiveValues: false, credentialsStored: false, exactShaBound: true, deploymentUrlsStored: false },
  };
}

function restoreSource() {
  return {
    schema: 'risck-comply.backup-restore-evidence.v2', evidenceItem: 'backup-restore-tested',
    status: 'Complete', outcome: 'passed', generatedAt: '2026-08-26T20:01:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas', branch: 'main', targetSha, observedSha: targetSha, runId: restoreRunId,
    controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'], failures: [],
    checks: {
      backupExists: true, restoreExecuted: true, dataIntegrity: true, rlsAfterRestore: true,
      rlsPoliciesPresent: true, rpoMeasured: true, rtoMeasured: true, distinctDatabases: true,
      protectedMainExecution: true, exactShaBound: true,
    },
    metrics: { rpoSeconds: 4, rtoSeconds: 27, totalExerciseSeconds: 42 },
    evidenceIntegrity: {
      containsSensitiveValues: false, credentialsStored: false, exactShaBound: true,
      databaseUrlsStored: false, dumpStored: false, rowDataStored: false,
    },
  };
}

function validateCanonicalDocuments(evidence: { rollback: unknown; restore: unknown }) {
  const root = mkdtempSync(join(tmpdir(), 'recovery-validator-'));
  roots.push(root);
  const rollbackPath = join(root, 'docs/security/evidence/runtime/rollback-validation.json');
  const restorePath = join(root, 'docs/security/evidence/p1/backup-restore-tested.json');
  mkdirSync(join(rollbackPath, '..'), { recursive: true });
  mkdirSync(join(restorePath, '..'), { recursive: true });
  writeFileSync(rollbackPath, `${JSON.stringify(evidence.rollback, null, 2)}\n`);
  writeFileSync(restorePath, `${JSON.stringify(evidence.restore, null, 2)}\n`);
  return spawnSync(process.execPath, [validatorPath], {
    cwd: root,
    env: { ...process.env, ENTERPRISE_EXPECTED_SHA: targetSha },
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('recovery resilience scorecard promotion', () => {
  it('selects rollback only from the explicit Recovery Resilience workflow on exact main SHA', () => {
    const accepted = {
      id: Number(rollbackRunId), path: workflowPath, head_sha: targetSha, head_branch: 'main',
      event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-26T20:02:00.000Z',
    };
    expect(selectExactShaRecoveryRun([
      { ...accepted, id: 7, event: 'push' },
      { ...accepted, id: 8, path: '.github/workflows/not-recovery.yml' },
      accepted,
    ], targetSha, rollbackRunId)?.id).toBe(Number(rollbackRunId));
    expect(selectExactShaRecoveryRun([{ ...accepted, head_branch: 'agent/unsafe' }], targetSha)).toBeNull();
  });

  it('selects restore only from successful provider-managed Stage 1 on exact main SHA', () => {
    const accepted = {
      id: Number(restoreRunId), path: restoreWorkflowPath, head_sha: targetSha, head_branch: 'main',
      event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-26T20:03:00.000Z',
    };
    expect(selectExactShaRecoveryDrillRun([
      { ...accepted, id: 8, conclusion: 'failure' },
      { ...accepted, id: 9, path: '.github/workflows/enterprise-recovery-drill.yml' },
      accepted,
    ], targetSha, restoreRunId)?.id).toBe(Number(restoreRunId));
    expect(selectExactShaRecoveryDrillRun([{ ...accepted, head_sha: 'b'.repeat(40) }], targetSha)).toBeNull();
  });

  it('validates rollback and provider-managed restore against their independent source run IDs', () => {
    expect(validateRollbackSource(rollbackSource(), { targetSha, runId: rollbackRunId })).toEqual([]);
    expect(validateBackupRestoreSource(restoreSource(), { targetSha, runId: restoreRunId })).toEqual([]);
    expect(validateRecoverySources(rollbackSource(), restoreSource(), {
      targetSha, rollbackRunId, restoreRunId,
    })).toEqual([]);

    const rollback = rollbackSource();
    const restore = restoreSource();
    rollback.checks.rollbackExecuted = false;
    restore.evidenceIntegrity.dumpStored = true;
    expect(validateRecoverySources(rollback, restore, {
      targetSha, rollbackRunId, restoreRunId,
    })).toEqual(expect.arrayContaining([
      'rollback_check_failed:rollbackExecuted', 'restore_dump_integrity_invalid',
    ]));
  });

  it('promotes REC-01 through REC-10 without pretending both proofs came from one run', () => {
    const evidence = buildCanonicalRecoveryEvidence(rollbackSource(), restoreSource(), {
      targetSha, rollbackRunId, restoreRunId,
    });
    for (const check of ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth']) {
      expect(evaluateEvidenceDocument(evidence.rollback, check)).toBe('PASS');
    }
    for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured']) {
      expect(evaluateEvidenceDocument(evidence.restore, check)).toBe('PASS');
    }
    expect(evidence.rollback.runId).toBe(rollbackRunId);
    expect(evidence.restore.runId).toBe(restoreRunId);
    expect(evidence.rollback.sourceWorkflow.file).toBe(workflowPath);
    expect(evidence.restore.sourceWorkflow.file).toBe(restoreWorkflowPath);
    expect([...evidence.rollback.controlsVerified, ...evidence.restore.controlsVerified])
      .toEqual(Array.from({ length: 10 }, (_, index) => `REC-${String(index + 1).padStart(2, '0')}`));
    expect(JSON.stringify(evidence)).not.toContain('databaseUrl');
    expect(validateCanonicalDocuments(evidence).status).toBe(0);
  });

  it('credits restore independently while retaining a non-crediting rollback placeholder', () => {
    const evidence = buildCanonicalRecoveryDrillEvidence(restoreSource(), { targetSha, runId: restoreRunId });
    expect(evidence.rollback.status).toBe('Open');
    expect(evidence.rollback.outcome).toBe('not_executed');
    expect(evidence.rollback.runId).toBeNull();
    expect(evidence.rollback.sourceWorkflow.file).toBe(workflowPath);
    expect(evidence.rollback.evidenceIntegrity.sourceRunBound).toBe(false);
    for (const check of ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth']) {
      expect(evaluateEvidenceDocument(evidence.rollback, check)).not.toBe('PASS');
    }
    expect(evidence.restore.status).toBe('Complete');
    expect(evidence.restore.sourceWorkflow.file).toBe(restoreWorkflowPath);
    for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured']) {
      expect(evaluateEvidenceDocument(evidence.restore, check)).toBe('PASS');
    }
    expect(validateCanonicalDocuments(evidence).status).toBe(0);
  });

  it('credits rollback independently while retaining a non-crediting restore placeholder', () => {
    const evidence = buildCanonicalRollbackOnlyEvidence(rollbackSource(), { targetSha, runId: rollbackRunId });
    expect(evidence.restore.status).toBe('Open');
    expect(evidence.restore.outcome).toBe('not_executed');
    expect(evidence.restore.runId).toBeNull();
    expect(evidence.restore.sourceWorkflow.file).toBe(restoreWorkflowPath);
    expect(evidence.restore.evidenceIntegrity.sourceRunBound).toBe(false);
    for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured']) {
      expect(evaluateEvidenceDocument(evidence.restore, check)).not.toBe('PASS');
    }
    expect(evidence.rollback.status).toBe('Complete');
    expect(evidence.rollback.sourceWorkflow.file).toBe(workflowPath);
    for (const check of ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth']) {
      expect(evaluateEvidenceDocument(evidence.rollback, check)).toBe('PASS');
    }
    expect(validateCanonicalDocuments(evidence).status).toBe(0);
  });

  it('rejects a missing-proof placeholder if it is relabeled as Complete', () => {
    const evidence = buildCanonicalRecoveryDrillEvidence(restoreSource(), { targetSha, runId: restoreRunId });
    evidence.rollback.status = 'Complete';
    evidence.rollback.outcome = 'passed';
    expect(validateCanonicalDocuments(evidence).status).not.toBe(0);
  });

  it('requires one bounded safe entry for each independent artifact', () => {
    expect(selectRollbackEvidenceEntry([
      'docs/security/evidence/runtime/rollback-validation.json', 'other/diagnostic.json',
    ])).toBe('docs/security/evidence/runtime/rollback-validation.json');
    expect(selectRecoveryDrillEvidenceEntry([
      'docs/security/evidence/p1/backup-restore-tested.json', 'other/diagnostic.json',
    ])).toBe('docs/security/evidence/p1/backup-restore-tested.json');
    expect(() => selectRollbackEvidenceEntry([
      '../rollback-validation.json',
    ])).toThrow('artifact_zip_unsafe_entry');
    expect(() => selectRecoveryDrillEvidenceEntry([
      'backup-restore-tested.json', 'copy/backup-restore-tested.json',
    ])).toThrow('backup_restore_tested_source_not_unique');
  });

  it('removes both stale recovery documents before every lookup', () => {
    const root = mkdtempSync(join(tmpdir(), 'recovery-fetch-'));
    roots.push(root);
    for (const relativePath of [
      'docs/security/evidence/runtime/rollback-validation.json',
      'docs/security/evidence/p1/backup-restore-tested.json',
    ]) {
      const path = join(root, relativePath);
      mkdirSync(join(path, '..'), { recursive: true });
      writeFileSync(path, '{}');
    }
    removeStaleRecoveryEvidence(root);
    expect(() => readFileSync(join(root, 'docs/security/evidence/runtime/rollback-validation.json'))).toThrow();
    expect(() => readFileSync(join(root, 'docs/security/evidence/p1/backup-restore-tested.json'))).toThrow();
  });
});
