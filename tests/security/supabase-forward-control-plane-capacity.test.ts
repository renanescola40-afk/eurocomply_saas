import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const productionHead = '20260909232229';
const friaMigration = '20260910113000_reconcile_fria_operational_runtime_v43.sql';
const article5Migration = '20260910114000_reconcile_prohibited_practices_runtime_v43.sql';
const dsrMigration = '20260910115000_atomic_data_subject_request_lifecycle_audit_v43.sql';
const expectedMigrations = [friaMigration, article5Migration, dsrMigration];

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact minimal V43 runtime package above the verified Production head', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));

    expect(config.changeSet).toBe('2026-09-10-production-runtime-contract-v43');
    expect(config.sourceChangeSet).toBe('2026-09-09-gdpr-rights-lifecycle-v42');
    expect(config.migrations.map((migration: { filename: string }) => migration.filename)).toEqual(expectedMigrations);
    expect(config.migrations).toHaveLength(3);

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
    expect(dsr).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);

    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });
    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations.map((migration) => migration.filename)).toEqual(expectedMigrations);
    expect(manifest.migrations).toHaveLength(3);
    expect(manifest.changeSet).toBe('2026-09-10-production-runtime-contract-v43');
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
    expect(manifest.checks.unrestrictedDbPushAuthorized).toBe(false);
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
});
