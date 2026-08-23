import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCanonicalRecoveryDrillEvidence,
  buildCanonicalRecoveryEvidence,
  removeStaleRecoveryEvidence,
  selectExactShaRecoveryDrillRun,
  selectExactShaRecoveryRun,
  selectRecoveryDrillEvidenceEntry,
  selectRecoveryEvidenceEntries,
  validateBackupRestoreSource,
  validateRecoverySources,
} from '../../scripts/enterprise/fetch-recovery-resilience-evidence.mjs';
import { evaluateEvidenceDocument } from '../../scripts/enterprise/generate-readiness-scorecard.mjs';

const targetSha = 'a'.repeat(40);
const runId = '123456';
const workflowPath = '.github/workflows/recovery-resilience-proof.yml';
const drillWorkflowPath = '.github/workflows/enterprise-recovery-drill.yml';
const roots: string[] = [];
const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
const stabilizerWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard-stabilizer.yml', 'utf8');

function rollbackSource() {
  return {
    schema: 'risck-comply.rollback-validation.v4', evidenceItem: 'rollback-validation',
    status: 'Complete', outcome: 'passed', generatedAt: '2026-08-07T10:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas', branch: 'main', targetSha, observedSha: targetSha, runId,
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
    status: 'Complete', outcome: 'passed', generatedAt: '2026-08-07T10:01:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas', branch: 'main', targetSha, observedSha: targetSha, runId,
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

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('recovery resilience scorecard promotion', () => {
  it('is orchestrated by the stabilizer and fetched before scorecard generation', () => {
    expect(stabilizerWorkflow).toContain('- Recovery Resilience Proof');
    expect(stabilizerWorkflow).toContain('- Enterprise Recovery Drill');
    expect(workflow).not.toContain('- Recovery Resilience Proof');
    expect(workflow).not.toContain("github.event.workflow_run.name == 'Recovery Resilience Proof'");
    expect(workflow).not.toContain('github.event.workflow_run');
    const fetchIndex = workflow.indexOf('Retrieve exact-SHA recovery resilience evidence');
    const scorecardIndex = workflow.indexOf('Generate scorecard');
    expect(fetchIndex).toBeGreaterThan(0);
    expect(scorecardIndex).toBeGreaterThan(fetchIndex);
    expect(workflow).toContain('docs/security/evidence/runtime/rollback-validation.json');
    expect(workflow).toContain('docs/security/evidence/p1/backup-restore-tested.json');
  });

  it('selects only the canonical successful full workflow-dispatch run on exact main SHA despite dynamic run-name', () => {
    const accepted = {
      id: Number(runId),
      name: `Recovery resilience proof for ${targetSha} (full)`,
      path: workflowPath,
      head_sha: targetSha,
      head_branch: 'main',
      event: 'workflow_dispatch',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-07T10:02:00.000Z',
    };
    expect(accepted.name).not.toBe('Recovery Resilience Proof');
    expect(selectExactShaRecoveryRun([
      { ...accepted, id: 7, event: 'push' },
      { ...accepted, id: 8, path: '.github/workflows/not-recovery.yml' },
      accepted,
    ], targetSha, runId)?.id).toBe(Number(runId));
    expect(selectExactShaRecoveryRun([{ ...accepted, head_branch: 'agent/unsafe' }], targetSha)).toBeNull();
    expect(selectExactShaRecoveryRun([{ ...accepted, path: '.github/workflows/not-recovery.yml' }], targetSha)).toBeNull();
  });

  it('selects an exact-main isolated recovery drill without requiring rollback confirmation', () => {
    const accepted = {
      id: Number(runId),
      name: 'Enterprise Recovery Drill',
      path: drillWorkflowPath,
      head_sha: targetSha,
      head_branch: 'main',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-07T10:03:00.000Z',
    };
    expect(selectExactShaRecoveryDrillRun([
      { ...accepted, id: 8, conclusion: 'failure' },
      { ...accepted, id: 9, head_branch: 'agent/unsafe' },
      accepted,
    ], targetSha)?.id).toBe(Number(runId));
    expect(selectExactShaRecoveryDrillRun([{ ...accepted, head_sha: 'b'.repeat(40) }], targetSha)).toBeNull();
    expect(selectExactShaRecoveryDrillRun([{ ...accepted, path: workflowPath }], targetSha)).toBeNull();
  });

  it('fails closed on mismatched SHA, run, controls, checks and sensitive evidence', () => {
    const rollback = rollbackSource();
    const restore = restoreSource();
    rollback.observedSha = 'b'.repeat(40);
    rollback.checks.rollbackExecuted = false;
    restore.runId = '999';
    restore.evidenceIntegrity.dumpStored = true;
    const failures = validateRecoverySources(rollback, restore, { targetSha, runId });
    expect(failures).toEqual(expect.arrayContaining([
      'rollback_sha_mismatch', 'rollback_check_failed:rollbackExecuted',
      'restore_run_mismatch', 'restore_dump_integrity_invalid',
    ]));
    expect(() => buildCanonicalRecoveryEvidence(rollback, restore, { targetSha, runId }))
      .toThrow('recovery_evidence_invalid');
  });

  it('validates the isolated restore source independently from rollback evidence', () => {
    expect(validateBackupRestoreSource(restoreSource(), { targetSha, runId })).toEqual([]);
    const restore = restoreSource();
    restore.checks.rlsAfterRestore = false;
    restore.evidenceIntegrity.rowDataStored = true;
    expect(validateBackupRestoreSource(restore, { targetSha, runId })).toEqual(expect.arrayContaining([
      'restore_check_failed:rlsAfterRestore',
      'restore_rows_integrity_invalid',
    ]));
  });

  it('promotes exactly REC-01 through REC-10 for the fully proven recovery workflow', () => {
    const evidence = buildCanonicalRecoveryEvidence(rollbackSource(), restoreSource(), { targetSha, runId });
    for (const check of ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth']) {
      expect(evaluateEvidenceDocument(evidence.rollback, check)).toBe('PASS');
    }
    for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured']) {
      expect(evaluateEvidenceDocument(evidence.restore, check)).toBe('PASS');
    }
    expect([...evidence.rollback.controlsVerified, ...evidence.restore.controlsVerified])
      .toEqual(Array.from({ length: 10 }, (_, index) => `REC-${String(index + 1).padStart(2, '0')}`));
    expect(evidence.rollback.sourceWorkflow.file).toBe(workflowPath);
    expect(JSON.stringify(evidence)).not.toContain('databaseUrl');
  });

  it('promotes REC-05 through REC-10 from the isolated drill while preserving zero rollback credit', () => {
    const evidence = buildCanonicalRecoveryDrillEvidence(restoreSource(), { targetSha, runId });
    expect(evidence.rollback.status).toBe('Open');
    expect(evidence.rollback.outcome).toBe('not_executed');
    expect(evidence.rollback.sourceWorkflow.name).toBe('Enterprise Recovery Drill');
    expect(evidence.rollback.sourceWorkflow.file).toBe(drillWorkflowPath);
    for (const check of ['rollbackTargetConfigured', 'distinctDeployment', 'rollbackExecuted', 'postRollbackHealth']) {
      expect(evaluateEvidenceDocument(evidence.rollback, check)).toBe('FAIL');
    }
    expect(evidence.rollback.checks.every((check) => check.passed === false)).toBe(true);
    expect(evidence.rollback.metrics.recoveryTimeSeconds).toBeNull();

    expect(evidence.restore.status).toBe('Complete');
    expect(evidence.restore.outcome).toBe('passed');
    expect(evidence.restore.sourceWorkflow.name).toBe('Enterprise Recovery Drill');
    expect(evidence.restore.sourceWorkflow.file).toBe(drillWorkflowPath);
    for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rpoMeasured', 'rtoMeasured']) {
      expect(evaluateEvidenceDocument(evidence.restore, check)).toBe('PASS');
    }
    expect(evidence.restore.controlsVerified).toEqual(['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10']);
    expect(JSON.stringify(evidence)).not.toContain('databaseUrl');
  });

  it('requires one bounded safe entry for each full source document', () => {
    expect(selectRecoveryEvidenceEntries([
      'runtime/rollback-validation.json', 'p1/backup-restore-tested.json',
    ])).toEqual({ rollback: 'runtime/rollback-validation.json', restore: 'p1/backup-restore-tested.json' });
    expect(() => selectRecoveryEvidenceEntries([
      '../rollback-validation.json', 'backup-restore-tested.json',
    ])).toThrow('artifact_zip_unsafe_entry');
    expect(() => selectRecoveryEvidenceEntries([
      'rollback-validation.json', 'copy/rollback-validation.json', 'backup-restore-tested.json',
    ])).toThrow('rollback_validation_source_not_unique');
  });

  it('accepts exactly one bounded restore entry from the isolated drill artifact', () => {
    expect(selectRecoveryDrillEvidenceEntry([
      'docs/security/evidence/p1/backup-restore-tested.json',
      'other/diagnostic.json',
    ])).toBe('docs/security/evidence/p1/backup-restore-tested.json');
    expect(() => selectRecoveryDrillEvidenceEntry([
      'backup-restore-tested.json',
      'copy/backup-restore-tested.json',
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
