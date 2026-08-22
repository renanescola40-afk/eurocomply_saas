import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const REMOTE_HEAD = '20260822120617';
const pairs = [
  ['20260813175000_optimize_organization_add_ons_rls_initplan.sql', '20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql'],
  ['20260813194500_reconcile_step_up_challenges_runtime.sql', '20260822123540_v19_reconcile_step_up_challenges_runtime.sql'],
  ['20260813200000_reconcile_subscription_schema_defaults.sql', '20260822123542_v19_reconcile_subscription_schema_defaults.sql'],
  ['20260813201500_reconcile_controlled_document_storage.sql', '20260822123544_v19_reconcile_controlled_document_storage.sql'],
  ['20260813201600_force_tasks_rls.sql', '20260822123546_v19_force_tasks_rls.sql'],
  ['20260813234000_reconcile_enterprise_break_glass_governance.sql', '20260822123548_v19_reconcile_enterprise_break_glass_governance.sql'],
  ['20260814090000_reconcile_enterprise_licensing_control_plane.sql', '20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql'],
  ['20260814091000_reconcile_enterprise_integrations_scim.sql', '20260822123552_v19_reconcile_enterprise_integrations_scim.sql'],
  ['20260814091100_harden_scim_identity_connection_delete_boundary.sql', '20260822123554_v19_harden_scim_identity_connection_delete_boundary.sql'],
  ['20260814091900_bridge_enterprise_contract_mode_compatibility.sql', '20260822123556_v19_bridge_enterprise_contract_mode_compatibility.sql'],
  ['20260814092000_reconcile_enterprise_billing_lifecycle.sql', '20260822123558_v19_reconcile_enterprise_billing_lifecycle.sql'],
  ['20260814092100_finalize_enterprise_contract_mode_compatibility.sql', '20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql'],
  ['20260814093000_reconcile_enterprise_contract_control_rpcs.sql', '20260822123602_v19_reconcile_enterprise_contract_control_rpcs.sql'],
  ['20260814101500_reconcile_enterprise_core_active_runtime.sql', '20260822123604_v19_reconcile_enterprise_core_active_runtime.sql'],
  ['20260815083000_reconcile_live_rls_validation_inventory_privileges.sql', '20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql'],
  ['20260815140500_reconcile_new_organization_compatibility_envelope.sql', '20260822123608_v19_reconcile_new_organization_compatibility_envelope.sql'],
  ['20260815141000_reconcile_enterprise_invitation_seat_authority.sql', '20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql'],
  ['20260815141500_harden_enterprise_invitation_actor_boundary.sql', '20260822123612_v19_harden_enterprise_invitation_actor_boundary.sql'],
  ['20260815142000_preserve_completed_onboarding_state.sql', '20260822123614_v19_preserve_completed_onboarding_state.sql'],
  ['20260815142500_reconcile_active_onboarding_runtime.sql', '20260822123616_v19_reconcile_active_onboarding_runtime.sql'],
  ['20260815143000_harden_active_onboarding_enterprise_boundaries.sql', '20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql'],
  ['20260816104000_guard_compliance_task_browser_mutations.sql', '20260822123620_v19_guard_compliance_task_browser_mutations.sql'],
  ['20260816104500_reconcile_gap_remediation_persistence.sql', '20260822123622_v19_reconcile_gap_remediation_persistence.sql'],
  ['20260816110000_harden_gap_personal_task_write_boundary.sql', '20260822123624_v19_harden_gap_personal_task_write_boundary.sql'],
  ['20260817001500_reconcile_enterprise_evidence_vault.sql', '20260822123626_v19_reconcile_enterprise_evidence_vault.sql'],
] as const;

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('Supabase V19 production-forward rebase', () => {
  it('reissues exactly the remaining 25 effects under CLI-issued versions after the live head', () => {
    const config = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
      changeSet: string;
      migrations: Array<{ filename: string }>;
      truthBoundary: Record<string, boolean>;
    };

    expect(config.changeSet).toBe('2026-08-22-enterprise-data-plane-closure-v19');
    expect(config.migrations).toHaveLength(25);
    expect(config.migrations.map((item) => item.filename)).toEqual(pairs.map(([, target]) => target));
    for (const [, target] of pairs) {
      expect(target.slice(0, 14)).toMatch(/^\d{14}$/);
      expect(Number(target.slice(0, 14))).toBeGreaterThan(Number(REMOTE_HEAD));
    }
    expect(config.migrations.map((item) => item.filename)).not.toContain(
      '20260822120617_atomic_vendor_risk_quota_mutations.sql',
    );
    expect(config.truthBoundary).toMatchObject({
      automaticClassification: false,
      productionWriteAuthorizedByConfig: false,
      migrationHistoryRepairAllowed: false,
      unrestrictedDbPushAllowed: false,
      onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
    });
  });

  it('preserves every reviewed SQL byte while changing only the active production-forward identity', () => {
    for (const [source, target] of pairs) {
      const sourceBytes = readFileSync(`supabase/reconciliation/v18-unapplied/${source}`);
      const targetBytes = readFileSync(`supabase/migrations/${target}`);
      expect(sha256(targetBytes), target).toBe(sha256(sourceBytes));
      expect(targetBytes.equals(sourceBytes), target).toBe(true);
    }
  });

  it('keeps the unapplied V18 identities outside normal migration replay', () => {
    for (const [source] of pairs) {
      expect(() => readFileSync(`supabase/reconciliation/v18-unapplied/${source}`)).not.toThrow();
      expect(() => readFileSync(`supabase/migrations/${source}`)).toThrow();
    }
  });

  it('records the already-present commercial migration as non-authorizing remote lineage', () => {
    const marker = readFileSync(
      'supabase/reconciliation/20260822120617_atomic_vendor_risk_quota_mutations.sql',
      'utf8',
    );
    expect(marker).toContain('RECONCILIATION RECORD ONLY');
    expect(marker).toContain('not asserted byte-identical');
    expect(marker).toContain('No DDL. No migration-history mutation. No production-write authorization.');
    expect(marker.toLowerCase()).not.toContain('insert into supabase_migrations.schema_migrations');
    expect(marker.toLowerCase()).not.toContain('migration repair');
    expect(marker).not.toContain('--include-all');
  });
});
