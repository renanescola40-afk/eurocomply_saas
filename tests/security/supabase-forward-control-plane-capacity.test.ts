import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { compileForwardReconciliationManifest } from '../../scripts/supabase/forward-reconciliation-control-plane.mjs';

const rootDir = process.cwd();
const subjectSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const sourceForwardPackage = [
  '20260906000000_reconcile_final_public_release_payment_storage_hardening.sql',
  '20260906003000_billing_ai_system_commercial_quota.sql',
  '20260906003500_billing_self_serve_member_capacity.sql',
  '20260906004000_billing_document_storage_quota.sql',
  '20260906004500_billing_entitlement_catalog_truth.sql',
  '20260906005000_billing_initial_checkout_singleflight.sql',
  '20260906006000_billing_completed_checkout_authority_guard.sql',
  '20260906006400_reconcile_paid_governance_runtime_foundations.sql',
  '20260906006500_billing_professional_task_plan_isolation.sql',
  '20260906006600_billing_business_feature_plan_isolation.sql',
  '20260906006700_billing_governance_workflow_plan_isolation.sql',
  '20260906006800_harden_cross_tenant_reference_integrity.sql',
];

const expectedV40ForwardPackage = [
  '20260908000000_reconcile_final_public_release_payment_storage_hardening.sql',
  '20260908003000_billing_ai_system_commercial_quota.sql',
  '20260908003500_billing_self_serve_member_capacity.sql',
  '20260908004000_billing_document_storage_quota.sql',
  '20260908004500_billing_entitlement_catalog_truth.sql',
  '20260908005000_billing_initial_checkout_singleflight.sql',
  '20260908006000_billing_completed_checkout_authority_guard.sql',
  '20260908006400_reconcile_paid_governance_runtime_foundations.sql',
  '20260908006500_billing_professional_task_plan_isolation.sql',
  '20260908006600_billing_business_feature_plan_isolation.sql',
  '20260908006700_billing_governance_workflow_plan_isolation.sql',
  '20260908006800_harden_cross_tenant_reference_integrity.sql',
];
const v41AdvisorMigration = '20260909006900_harden_security_advisor_rpc_surface.sql';
const expectedV41ForwardPackage = [...expectedV40ForwardPackage, v41AdvisorMigration];

describe('Supabase forward reconciliation control-plane capacity', () => {
  it('compiles the exact V41 package while preserving the byte-identical V40 prefix', async () => {
    const config = JSON.parse(await readFile('config/supabase-forward-reconciliation.json', 'utf8'));

    expect(config.changeSet).toBe('2026-09-09-supabase-advisor-rpc-hardening-v41');
    expect(config.sourceChangeSet).toBe('2026-09-08-post-audit-containment-forward-reconciliation-v40');
    expect(config.migrations.map((migration: { filename: string }) => migration.filename)).toEqual(expectedV41ForwardPackage);
    expect(config.migrations).toHaveLength(13);

    for (let index = 0; index < expectedV40ForwardPackage.length; index += 1) {
      const source = await readFile(`supabase/migrations/${sourceForwardPackage[index]}`);
      const target = await readFile(`supabase/migrations/${expectedV40ForwardPackage[index]}`);
      expect(target.equals(source)).toBe(true);
      expect(expectedV40ForwardPackage[index].slice(0, 14) > '20260907142133').toBe(true);
      expect(target.toString('utf8')).not.toContain('append_audit_event_chained');
    }

    const v41Sql = await readFile(`supabase/migrations/${v41AdvisorMigration}`, 'utf8');
    expect(v41Sql).toContain('app_private.enterprise_member_can_read');
    expect(v41Sql).toContain('app_private.enterprise_member_can_manage');
    expect(v41Sql).not.toContain('disable row level security');

    const manifest = await compileForwardReconciliationManifest({ config, rootDir, subjectSha });

    expect(manifest.targetSha).toBe(subjectSha);
    expect(manifest.migrations.map((migration) => migration.filename)).toEqual(expectedV41ForwardPackage);
    expect(manifest.migrations).toHaveLength(13);
    expect(manifest.changeSet).toBe('2026-09-09-supabase-advisor-rpc-hardening-v41');
    expect(manifest.checks.productionWriteAuthorized).toBe(false);
    expect(manifest.checks.migrationHistoryRepairAuthorized).toBe(false);
    expect(manifest.checks.unrestrictedDbPushAuthorized).toBe(false);
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
