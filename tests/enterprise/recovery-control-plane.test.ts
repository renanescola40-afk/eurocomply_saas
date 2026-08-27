import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guard = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const rollback = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
const providerRestore = readFileSync('scripts/recovery/verify-supabase-provider-managed-restore.mjs', 'utf8');
const providerDestroy = readFileSync('scripts/recovery/destroy-supabase-provider-managed-restore.mjs', 'utf8');
const collector = readFileSync('scripts/enterprise/fetch-recovery-resilience-evidence.mjs', 'utf8');

const forbiddenHostedProductionDumpTokens = [
  'RECOVERY_SOURCE_DATABASE_URL',
  'SUPABASE_DB_POOLER_URL',
  'run-backup-restore-exercise.mjs',
  'supabase db dump',
  'pg_dump',
  'production-data.sql',
  'production-backup.dump',
];

describe('enterprise recovery control plane', () => {
  it('keeps the legacy drill name as a non-crediting contract guard with no protected secrets', () => {
    expect(guard).toContain('Verify provider-managed recovery boundary');
    expect(guard).toContain('This workflow is a contract guard only');
    expect(guard).toContain('Supabase Forward Reconciliation Rehearsal');
    expect(guard).not.toContain('environment: production-recovery');
    expect(guard).not.toMatch(/secrets\./);
    for (const token of forbiddenHostedProductionDumpTokens) expect(guard).not.toContain(token);
  });

  it('uses Stage 1 provider-managed restore as the sole REC-05 through REC-10 authority', () => {
    expect(rehearsal).toContain('verify-supabase-provider-managed-restore.mjs');
    expect(rehearsal).toContain('destroy-supabase-provider-managed-restore.mjs');
    expect(rehearsal).toContain('SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED');
    expect(rehearsal).toContain('RECOVERY_PROVIDER_RESTORE_PROJECT_REF');
    expect(rehearsal).toContain('RECOVERY_PROVIDER_BACKUP_ID');
    expect(rehearsal).toContain('supabase-production-migration-dry-run');
    for (const token of forbiddenHostedProductionDumpTokens) expect(rehearsal).not.toContain(token);

    expect(providerRestore).toContain('supabase-provider-managed-physical-backup-clone');
    expect(providerRestore).toContain("controlsVerified:['REC-05','REC-06','REC-07','REC-08','REC-09','REC-10']");
    expect(providerRestore).toContain('productionDumpCreatedOnGithubRunner:false');
    expect(providerDestroy).toContain('DELETE');
    expect(providerDestroy).toContain('restore_project_ref_invalid_or_not_distinct');
  });

  it('keeps rollback independent, exact-SHA and explicitly confirmed', () => {
    expect(rollback).toContain('RECOVERY_REQUIRED_EXERCISE: production-rollback');
    expect(rollback).toContain('EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK');
    expect(rollback).toContain('environment: production-recovery');
    expect(rollback).toContain('run-live-rollback-exercise.mjs');
    expect(rollback).toContain('check-recovery-evidence.mjs');
    expect(rollback).toContain('recovery-resilience-proof-${{ inputs.release_sha }}');
    for (const token of forbiddenHostedProductionDumpTokens) expect(rollback).not.toContain(token);
  });

  it('composes rollback and restore from independent exact-SHA producers', () => {
    expect(collector).toContain("const WORKFLOW_FILE = 'recovery-resilience-proof.yml';");
    expect(collector).toContain("const RESTORE_WORKFLOW_FILE = 'supabase-forward-reconciliation-rehearsal.yml';");
    expect(collector).toContain('rollbackRunId');
    expect(collector).toContain('restoreRunId');
    expect(collector).toContain('buildCanonicalRecoveryEvidence');
    expect(collector).toContain('buildCanonicalRecoveryDrillEvidence');
    expect(collector).toContain('buildCanonicalRollbackOnlyEvidence');
    expect(collector).not.toContain("const DRILL_WORKFLOW_FILE = 'enterprise-recovery-drill.yml';");
  });
});
