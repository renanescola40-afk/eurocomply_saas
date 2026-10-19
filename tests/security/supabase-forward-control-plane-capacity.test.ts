import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const productionHead = '20260909232229';
const friaMigration = '20260910113000_reconcile_fria_operational_runtime_v43.sql';
const article5ReplayCompatMigration = '20260910113500_article5_policy_replay_compatibility_v43.sql';
const article5Migration = '20260910114000_reconcile_prohibited_practices_runtime_v43.sql';
const dsrMigration = '20260910115000_atomic_data_subject_request_lifecycle_audit_v43.sql';
const expectedMigrations = [friaMigration, article5ReplayCompatMigration, article5Migration, dsrMigration];

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact minimal V43 runtime package above the verified Production head', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const v43 = config.historicalBaselines.v43;

    expect(v43.changeSet).toBe('2026-09-10-production-runtime-contract-v43');
    expect(v43.sourceChangeSet).toBe('2026-09-09-gdpr-rights-lifecycle-v42');
    expect(v43.migrations.map((migration: { filename: string }) => migration.filename)).toEqual(expectedMigrations);
    expect(v43.migrations).toHaveLength(4);

    let previous = productionHead;
    for (const filename of expectedMigrations) {
      const version = filename.slice(0, 14);
      expect(version > previous).toBe(true);
      previous = version;
    }

    const fria = await readFile(`supabase/migrations/${friaMigration}`, 'utf8');
    expect(fria).toContain('create_fria_assessment_atomic');
    expect(fria).toContain('approve_fria_assessment_atomic');
    expect(fria).toContain('compensate_fria_approval_audit_failure');
    expect(fria).toContain('enforce_fria_member_scope');
    expect(fria).toContain('force row level security');
    expect(fria).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);

    const replayCompat = await readFile(`supabase/migrations/${article5ReplayCompatMigration}`, 'utf8');
    for (const policy of [
      'ai_prohibited_reviews_member_select',
      'ai_prohibited_signals_member_select',
      'ai_prohibited_exceptions_member_select',
      'ai_prohibited_evidence_member_select',
      'ai_prohibited_decisions_member_select',
    ]) {
      expect(replayCompat).toContain(`drop policy if exists ${policy}`);
    }
    expect(replayCompat).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);

    const article5 = await readFile(`supabase/migrations/${article5Migration}`, 'utf8');
    for (const table of [
      'ai_prohibited_practice_reviews',
      'ai_prohibited_practice_signal_assessments',
      'ai_prohibited_practice_exception_claims',
      'ai_prohibited_practice_evidence',
      'ai_prohibited_practice_decisions',
    ]) {
      expect(article5).toContain(`create table if not exists public.${table}`);
      expect(article5).toContain(`alter table public.${table} force row level security`);
    }
    expect(article5).toContain('app_private.is_org_member(organization_id)');
    expect(article5).toContain('create_prohibited_practices_review_atomic');
    expect(article5).toContain('approve_prohibited_practices_review_atomic');
    expect(article5).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);

    const dsr = await readFile(`supabase/migrations/${dsrMigration}`, 'utf8');
    expect(dsr).toContain('update_data_subject_request_with_audit_atomic');
    expect(dsr).toContain('append_audit_event_chained');
    expect(dsr).toContain('set search_path = pg_catalog');
    expect(dsr).toContain('to service_role');
    expect(dsr).toContain('enforce_onboarding_document_storage_integrity');
    expect(dsr).toContain("object_record.bucket_id = 'controlled-documents'");
    expect(dsr).toContain("'orphanedStoragePath'");
    expect(dsr).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);

    const manifest = await compileForwardReconciliationManifest({ config: v43, rootDir, subjectSha });
    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations.map((migration) => migration.filename)).toEqual(expectedMigrations);
    expect(manifest.migrations).toHaveLength(4);
    expect(manifest.changeSet).toBe('2026-09-10-production-runtime-contract-v43');
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
    expect(manifest.checks.unrestrictedDbPushAuthorized).toBe(false);
  });


  it('binds the current V44 selected manifest to exactly six October P0 migrations', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const selected = [
      '20261015235500_enterprise_private_membership_mfa_gate.sql',
      '20261018023000_guard_last_active_owner_removal.sql',
      '20261018113000_atomic_member_removal_with_chained_audit.sql',
      '20261018160000_atomic_member_role_change_with_chained_audit.sql',
      '20261018183000_guard_last_active_owner_seat_release.sql',
      '20261018190000_reconcile_audited_membership_usage_counters.sql',
    ];

    expect(config.changeSet).toBe('2026-10-19-p0-membership-security-v44');
    expect(config.sourceChangeSet).toBe('2026-09-10-production-runtime-contract-v43');
    expect(config.migrations.map((item: { filename: string }) => item.filename)).toEqual(selected);
    expect(config.historicalBaselines.v43.migrations).toHaveLength(4);

    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });
    expect(manifest.changeSet).toBe(config.changeSet);
    expect(manifest.migrations.map((item) => item.filename)).toEqual(selected);
    expect(manifest.migrations).toHaveLength(6);
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
  });

  it('requires V44 catalog postconditions before accepting an isolated or LIVE forward cutover', async () => {
    const sql = await readFile('scripts/supabase/verify-forward-reconciliation-postconditions.sql', 'utf8');
    for (const required of [
      'do $p0_v44$',
      'enterprise_member_can_read(uuid)',
      'enterprise_member_can_manage(uuid)',
      'tenant_mfa_satisfied(p_organization_id)',
      'remove_organization_member_atomic(uuid,uuid,uuid,text)',
      'release_organization_seat_atomic(uuid,uuid,uuid,text,text)',
      'remove_organization_member_audited_atomic',
      'change_organization_member_role_audited_atomic',
      'v_active_owner_count',
      'last_reconciled_at',
      'append_audit_event_chained',
      "has_function_privilege('authenticated', v_audited_remove, 'EXECUTE')",
      "has_function_privilege('anon', v_audited_role, 'EXECUTE')",
      'not c.relforcerowsecurity',
      "'p0_v44_postconditions_passed'",
    ]) expect(sql).toContain(required);
    const start = sql.indexOf('do $p0_v44$');
    const finish = sql.indexOf('$p0_v44$;', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(finish).toBeGreaterThan(start);
    const p0Verifier = sql.slice(start, finish);
    expect(p0Verifier).not.toContain('drifted_usage_organizations');
    expect(p0Verifier).not.toContain('legacy_removal_retired');
    expect(p0Verifier).not.toContain('supabase_migrations.schema_migrations');
  });

  it('retains V42 as historical provenance instead of selected Production work', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    expect(config.historicalBaselines?.v42?.changeSet).toBe('2026-09-09-gdpr-rights-lifecycle-v42');
    expect(config.historicalBaselines?.v42?.migrations).toHaveLength(2);
    expect(config.migrations.map((migration: { filename: string }) => migration.filename)).not.toContain(
      '20260909142500_reconcile_data_governance_enterprise_foundation.sql',
    );
  });

  it('remains fail-closed above the reviewed 33-item package ceiling', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const overLimit = {
      ...config,
      migrations: Array.from({ length: 34 }, (_, index) => ({
        filename: `20990101${String(index).padStart(6, '0')}_unreviewed_future_migration.sql`,
        purpose: 'must not be accepted',
      })),
    };

    await expect(
      compileForwardReconciliationManifest({ config: overLimit, rootDir, subjectSha }),
    ).rejects.toThrow('config migrations must contain 1-33 items');
  });
  it('compiles six reviewed P0 membership migrations even when SQL starts with line comments', async () => {
    const base = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));
    const files = [
      '20261015235500_enterprise_private_membership_mfa_gate.sql',
      '20261018023000_guard_last_active_owner_removal.sql',
      '20261018113000_atomic_member_removal_with_chained_audit.sql',
      '20261018160000_atomic_member_role_change_with_chained_audit.sql',
      '20261018183000_guard_last_active_owner_seat_release.sql',
      '20261018190000_reconcile_audited_membership_usage_counters.sql',
    ];

    const selected = {
      ...base,
      changeSet: '2026-10-19-p0-membership-security-v44',
      migrations: files.map((filename) => ({ filename, purpose: 'synthetic source-only admission' })),
    };

    for (const filename of files) {
      const sql = await readFile(`supabase/migrations/${filename}`, 'utf8');
      expect(sql).toMatch(/begin\s*;/i);
      expect(sql.trimEnd()).toMatch(/commit\s*;$/i);
      expect(filename.slice(0, 14) > '20261015205458').toBe(true);
    }

    const manifest = await compileForwardReconciliationManifest({
      config: selected,
      rootDir,
      subjectSha,
    });

    expect(manifest.migrations.map((migration) => migration.filename)).toEqual(files);
    expect(manifest.migrations).toHaveLength(6);
    expect(manifest.checks.transactionWrapped).toBe(true);
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
  });

});
