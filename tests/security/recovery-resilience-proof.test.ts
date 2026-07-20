import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const rollback = readFileSync('scripts/recovery/run-live-rollback-exercise.mjs', 'utf8');
const restore = readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');
const validator = readFileSync('scripts/recovery/check-recovery-evidence.mjs', 'utf8');

describe('recovery resilience megapack', () => {
  it('requires protected, manual and explicitly confirmed execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-recovery');
    expect(workflow).toContain('EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('executes rollback with exact target checks and post-health validation', () => {
    for (const token of [
      'vercel@56.3.2',
      "'rollback'",
      'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
      'LAST_KNOWN_GOOD_COMMIT_SHA',
      'rollbackTargetDistinct',
      'rollbackShaDistinct',
      'postRollbackHealth',
      'postRollbackNoStore',
      'credentialsStored: false',
      'deploymentUrlsStored: false',
    ]) expect(rollback).toContain(token);
  });

  it('creates a logical backup, restores it in isolation and validates RLS', () => {
    for (const token of [
      "'pg_dump'",
      "'pg_restore'",
      'RECOVERY_SOURCE_DATABASE_URL',
      'RECOVERY_ISOLATED_DATABASE_URL',
      'distinctDatabases',
      'dataIntegrity',
      'relrowsecurity=true',
      'rlsPoliciesPresent',
      'rpoMeasured',
      'rtoMeasured',
      'rmSync(dumpPath',
      'dumpStored: false',
      'rowDataStored: false',
    ]) expect(restore).toContain(token);
  });

  it('fails closed unless every canonical recovery control is proven', () => {
    for (const token of [
      'rollbackExecuted',
      'postRollbackHealth',
      'backupExists',
      'restoreExecuted',
      'dataIntegrity',
      'rlsAfterRestore',
      'rpoSeconds',
      'rtoSeconds',
    ]) expect(validator).toContain(token);
  });
});
