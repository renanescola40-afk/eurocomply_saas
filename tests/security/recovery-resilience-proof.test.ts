import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const rollback = readFileSync('scripts/recovery/run-live-rollback-exercise.mjs', 'utf8');
const providerRestore = readFileSync('scripts/recovery/verify-supabase-provider-managed-restore.mjs', 'utf8');
const ledgerBinder = readFileSync('scripts/recovery/bind-backup-restore-migration-ledger.mjs', 'utf8');
const validator = readFileSync('scripts/recovery/check-recovery-evidence.mjs', 'utf8');

describe('recovery resilience promotion megapack', () => {
  it('supports exact-SHA full, backup-restore and rollback modes without a Production dump path', () => {
    for (const token of [
      'release_sha:',
      '- full',
      '- backup-restore',
      '- production-rollback',
      'EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK',
      'SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED',
      'environment: production-recovery',
      'git rev-parse origin/main',
      "inputs.exercise == 'full' || inputs.exercise == 'backup-restore'",
      "inputs.exercise == 'full' || inputs.exercise == 'production-rollback'",
      'recovery-resilience-${{ inputs.release_sha }}-${{ inputs.exercise }}',
      'verify-supabase-provider-managed-restore.mjs verify',
      'bind-backup-restore-migration-ledger.mjs',
      'destroy-supabase-provider-managed-restore.mjs',
    ]) expect(workflow).toContain(token);

    for (const forbidden of [
      'RECOVERY_SOURCE_DATABASE_URL',
      'SUPABASE_DB_POOLER_URL',
      'run-backup-restore-exercise.mjs',
      'manage-ephemeral-recovery-database.mjs start',
      'supabase db dump',
      'pg_dump',
    ]) expect(workflow).not.toContain(forbidden);
    expect(workflow).not.toContain('continue-on-error: true');
  });

  it('keeps Production observation read-only while proving restored postconditions on the isolated provider clone', () => {
    expect(providerRestore).toContain('/database/query/read-only');
    expect(providerRestore).toContain('productionObservationReadOnly:true');
    expect(providerRestore).toContain('productionDumpCreatedOnGithubRunner:false');
    expect(ledgerBinder).toContain('/database/query/read-only');
    expect(ledgerBinder).toContain('sourceMigrationLedgerCaptured: true');
    expect(ledgerBinder).toContain('selectedForwardSetPresentInSource');
    expect(ledgerBinder).toContain('restoredPostconditionsPassed');
    expect(ledgerBinder).toContain('migrationVersionsStored: false');
    expect(ledgerBinder).toContain('restoredPostconditionOutputStored: false');
    expect(ledgerBinder).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(ledgerBinder).not.toContain('psql');
    expect(ledgerBinder).not.toContain('docker');
  });

  it('emits exact-SHA promotable rollback and provider-managed restore evidence', () => {
    for (const token of [
      "controlsVerified: ['REC-01', 'REC-02', 'REC-03', 'REC-04']",
      'observedSha',
      "runId: env('GITHUB_RUN_ID')",
      'containsSensitiveValues: false',
      "redirect: 'error'",
    ]) expect(rollback).toContain(token);

    for (const token of [
      "controlsVerified:['REC-05','REC-06','REC-07','REC-08','REC-09','REC-10']",
      'providerManagedRestore:true',
      'rpoMeasured:true',
      'rtoMeasured:true',
      'containsSensitiveValues:false',
      'dumpStored:false',
      'rowDataStored:false',
    ]) expect(providerRestore).toContain(token);
  });

  it('requires the selected canonical evidence set and matching exact-SHA provenance', () => {
    for (const token of [
      "['full', 'backup-restore', 'production-rollback']",
      'requireRollback',
      'requireRestore',
      'recovery evidence run ID mismatch',
      'containsSensitiveValues',
      'REC-10',
    ]) expect(validator).toContain(token);
    expect(validator).not.toContain('existsSync(');
  });
});
