import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-forward-production-acceptance.yml', 'utf8');
const recoveryWorkflow = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const recoveryBinder = readFileSync('scripts/recovery/bind-backup-restore-migration-ledger.mjs', 'utf8');
const tenantProof = readFileSync('scripts/supabase/assert-live-tenant-isolation-read-only.sql', 'utf8');
const crossTenantPostconditions = readFileSync(
  'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql',
  'utf8',
);
const verifier = readFileSync('scripts/supabase/verify-forward-production-acceptance.mjs', 'utf8');
const runbook = readFileSync('docs/runbooks/SUPABASE_FORWARD_PRODUCTION_ACCEPTANCE.md', 'utf8');

function jobHeader(text: string, jobName: string) {
  const jobIndex = text.indexOf(`  ${jobName}:`);
  expect(jobIndex).toBeGreaterThanOrEqual(0);
  const stepsIndex = text.indexOf('    steps:', jobIndex);
  expect(stepsIndex).toBeGreaterThan(jobIndex);
  return text.slice(jobIndex, stepsIndex);
}

function executableMigrationCommands(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('supabase ') || line.startsWith('psql ') || line.startsWith('node '));
}

describe('Supabase post-promotion production acceptance', () => {
  it('is manual, exact-SHA, provenance-bound and protected before database secret access', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('promotion_run_id:');
    expect(workflow).toContain('recovery_run_id:');
    expect(workflow).toContain('ACCEPT ${TARGET_SHA} AFTER PROMOTION ${PROMOTION_RUN_ID} AND RECOVERY ${RECOVERY_RUN_ID}');
    expect(workflow).toContain('GITHUB_ENVIRONMENT_NAME: Production');
    expect(workflow).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(workflow).toContain('environment: Production');
    expect(workflow).toContain('.github/workflows/supabase-forward-reconciliation-production-promotion.yml');
    expect(workflow).toContain('.github/workflows/recovery-resilience-proof.yml');
    expect(workflow).toContain("'.conclusion' <<<\"$PROMOTION_JSON\"");
    expect(workflow).toContain("'.conclusion' <<<\"$RECOVERY_JSON\"");
  });

  it('requires the provider-managed recovery exercise to start only after successful Production promotion', () => {
    expect(workflow).toContain('PROMOTION_FINISHED_AT=');
    expect(workflow).toContain('RECOVERY_STARTED_AT=');
    expect(workflow).toContain('recoveryStarted <= promotionFinished');
    expect(workflow).toContain('post-promotion exact-SHA Recovery Resilience Proof');
    expect(recoveryWorkflow).toContain('verify-supabase-provider-managed-restore.mjs verify');
    expect(recoveryWorkflow).toContain('bind-backup-restore-migration-ledger.mjs');
    expect(recoveryWorkflow).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(recoveryWorkflow).not.toContain('run-backup-restore-exercise.mjs');
  });

  it('keeps the pooler secret step-local and never adds a migration execution path', () => {
    const executable = executableMigrationCommands(workflow).join('\n');
    expect(jobHeader(workflow, 'acceptance')).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(workflow).toContain('secrets.SUPABASE_DB_POOLER_URL');
    expect(executable).not.toContain(' db push ');
    expect(executable).not.toContain('--include-all');
    expect(executable).not.toContain('migration repair');
    expect(executable).not.toContain('supabase migration');
    expect(executable).not.toContain('apply_migration');
  });

  it('re-observes the ledger and live security state instead of trusting promotion-time evidence alone', () => {
    expect(workflow).toContain('select version from supabase_migrations.schema_migrations order by version');
    expect(workflow).toContain("--command 'begin transaction read only;'");
    expect(workflow).toContain('verify-forward-reconciliation-postconditions.sql');
    expect(workflow).toContain('verify-cross-tenant-reference-integrity-postconditions.sql');
    expect(workflow).toContain("--command 'rollback;'");
    expect(workflow).toContain('assert-live-tenant-isolation-read-only.sql');
    expect(workflow).toContain('verify-forward-production-acceptance.mjs');
    expect(crossTenantPostconditions).toContain('begin transaction read only').not;
    expect(crossTenantPostconditions).toContain('app_private.enforce_same_tenant_reference_integrity()');
    expect(crossTenantPostconditions).toContain('cross-tenant reference integrity violation exists after promotion');
    expect(verifier).toContain('post-promotion migration drift detected');
    expect(verifier).toContain('liveTenantIsolationPassed: true');
    expect(verifier).toContain('backupRestoreExactShaPassed: true');
    expect(verifier).toContain('backupRestoreSourceLedgerMatchesPromotion: true');
    expect(verifier).toContain('restoredForwardPostconditionsPassed: true');
  });

  it('binds provider-managed backup/restore to the post-promotion source ledger and proves restored forward postconditions', () => {
    expect(recoveryWorkflow).toContain('Bind provider-managed backup restore evidence to post-promotion source ledger');
    expect(recoveryWorkflow).toContain('node scripts/recovery/bind-backup-restore-migration-ledger.mjs');
    expect(recoveryBinder).toContain('/database/query/read-only');
    expect(recoveryBinder).toContain('select version from supabase_migrations.schema_migrations order by version;');
    expect(recoveryBinder).toContain('sourceMigrationLedgerCaptured: true');
    expect(recoveryBinder).toContain('migrationVersionsStored: false');
    expect(recoveryBinder).toContain('sourceMigrationLedgerDigestStored: true');
    expect(recoveryBinder).toContain('verify-forward-reconciliation-postconditions.sql');
    expect(recoveryBinder).toContain('verify-cross-tenant-reference-integrity-postconditions.sql');
    expect(recoveryBinder).toContain('restoredPostconditionsExecuted');
    expect(recoveryBinder).toContain('restoredPostconditionsPassed');
    expect(recoveryBinder).toContain('restoredPostconditionOutputStored: false');
    expect(recoveryBinder).toContain('productionObservationReadOnly: true');
    expect(recoveryBinder).toContain('productionDumpCreatedOnGithubRunner: false');
    expect(recoveryBinder).not.toContain('RECOVERY_SOURCE_DATABASE_URL');
    expect(recoveryBinder).not.toContain('psql');
    expect(recoveryBinder).not.toContain('docker');
    expect(verifier).toContain('source migration ledger digest differs from promoted ledger');
    expect(verifier).toContain('backup/restore restored forward postconditions did not pass');
  });

  it('executes live two-tenant behavior only inside a read-only transaction with existing actors', () => {
    expect(tenantProof).toContain('begin transaction read only;');
    expect(tenantProof).toContain('rollback;');
    expect(tenantProof).toContain('set local role authenticated;');
    expect(tenantProof).toContain('request.jwt.claim.sub');
    expect(tenantProof).toContain('join auth.users auth_a');
    expect(tenantProof).toContain('join auth.users auth_b');
    expect(tenantProof).toContain('actor A can read a foreign organization');
    expect(tenantProof).toContain('actor B can read a foreign organization');
    expect(tenantProof).toContain('Evidence Vault RLS/FORCE RLS');
    expect(tenantProof).toContain('rls_compliance_evidence_objects_select_organization');
    expect(tenantProof).not.toMatch(/^\s*(insert|update|delete|truncate|alter|drop|create)\s+/gim);
  });

  it('requires exact-SHA backup/restore but explicitly refuses to credit provider credential revocation', () => {
    expect(verifier).toContain('risck-comply.backup-restore-evidence.v2');
    expect(verifier).toContain('REC-05');
    expect(verifier).toContain('REC-10');
    expect(verifier).toContain('providerCredentialRevocationClaimed: false');
    expect(runbook).toContain('#1620');
    expect(runbook).toContain('provider-side');
    expect(runbook).toContain('does not prove');
  });

  it('retains only redacted acceptance evidence', () => {
    expect(workflow).toContain('Scan retained acceptance evidence for secret and tenant identifiers');
    expect(workflow).toContain('userIdsStored:false');
    expect(workflow).toContain('organizationIdsStored:false');
    expect(verifier).toContain('credentialsStored: false');
    expect(verifier).toContain('databaseUrlsStored: false');
    expect(verifier).toContain('rowDataStored: false');
    expect(verifier).toContain('restoredPostconditionOutputStored: false');
  });
});
