import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
  migrations: Array<{ filename: string }>;
  truthBoundary: Record<string, boolean>;
};
const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
const dryRun = readFileSync('.github/workflows/supabase-forward-reconciliation-dry-run.yml', 'utf8');
const postconditions = readFileSync('scripts/supabase/verify-forward-reconciliation-postconditions.sql', 'utf8');
const historicalCore = readFileSync(
  'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
  'utf8',
);
const historicalVendorIntegrity = readFileSync(
  'supabase/migrations/20260720044500_vendor_governance_integrity.sql',
  'utf8',
);
const forwardCore = readFileSync(
  'supabase/migrations/20260814101500_reconcile_enterprise_core_active_runtime.sql',
  'utf8',
);

const selected = config.migrations.map((migration) => migration.filename);

describe('bounded Supabase forward reconciliation contract', () => {
  it('selects exactly the seven bounded forward-only reconciliation identities', () => {
    expect(selected).toEqual([
      '20260813175000_optimize_organization_add_ons_rls_initplan.sql',
      '20260813194500_reconcile_step_up_challenges_runtime.sql',
      '20260813200000_reconcile_subscription_schema_defaults.sql',
      '20260813201500_reconcile_controlled_document_storage.sql',
      '20260813201600_force_tasks_rls.sql',
      '20260813234000_reconcile_enterprise_break_glass_governance.sql',
      '20260814101500_reconcile_enterprise_core_active_runtime.sql',
    ]);
    expect(selected).not.toContain('20260809135000_enterprise_core_runtime_schema_reconciliation.sql');
    expect(config.truthBoundary).toMatchObject({
      automaticClassification: false,
      productionWriteAuthorizedByConfig: false,
      migrationHistoryRepairAllowed: false,
      unrestrictedDbPushAllowed: false,
      onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
    });
  });

  it('does not carry historical human approval into the newer active-core execution identity', () => {
    expect(historicalCore).toContain('enterprise-migration-review: approved');
    expect(forwardCore).not.toContain('enterprise-migration-review: approved');
    expect(forwardCore).toContain('The historical migration remains byte-for-byte');
    expect(forwardCore).toContain('contains no destructive data rewrite');
  });

  it('preserves active-core objects while retaining later vendor tenant-integrity hardening', () => {
    for (const invariant of [
      'create table if not exists public.intelligence_items',
      'create table if not exists public.email_notification_events',
      'create table if not exists public.vendor_review_history',
      'public.create_organization_with_owner_atomic',
      "policyname like 'live_rls_%'",
    ]) {
      expect(historicalCore).toContain(invariant);
      expect(forwardCore).toContain(invariant);
    }

    for (const invariant of [
      'vendor creator must belong to organization',
      'vendor approver must be an authorized organization member',
      "om.user_id = new.created_by",
      "om.user_id = new.approved_by",
      "om.role in ('owner', 'admin', 'compliance_manager')",
    ]) {
      expect(historicalVendorIntegrity).toContain(invariant);
      expect(forwardCore).toContain(invariant);
    }

    expect(forwardCore).toContain('create or replace function public.enforce_vendor_governance_integrity()');
    expect(forwardCore).toContain('security definer');
    expect(forwardCore).toContain('set search_path = pg_catalog, public');
    expect(forwardCore).toContain('new.review_version = old.review_version + 1');
    expect(forwardCore).toContain('before insert or update on public.vendors');
    expect(forwardCore).toContain('revoke all on function public.enforce_vendor_governance_integrity() from public, anon, authenticated');
    expect(forwardCore).toContain('grant execute on function public.enforce_vendor_governance_integrity() to service_role');
    expect(forwardCore).toContain('Vendor governance tenant-integrity trigger is missing after reconciliation');
  });

  it('triggers both bounded workflows when any selected SQL byte changes', () => {
    for (const filename of selected) {
      const path = `supabase/migrations/${filename}`;
      expect(rehearsal).toContain(`- '${path}'`);
      expect(dryRun).toContain(`- '${path}'`);
    }
  });

  it('uses one pinned Supabase CLI baseline across rehearsal and filtered dry-run', () => {
    for (const workflow of [rehearsal, dryRun]) {
      expect(workflow).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(workflow).toContain('version: 2.114.0');
      expect(workflow).not.toContain('version: latest');
    }
  });

  it('keeps the bounded workflows fail-closed for production writes', () => {
    expect(dryRun).toContain('db push --dry-run --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(dryRun).not.toContain('db push --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(rehearsal).not.toContain('db push');
    expect(config.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(config.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(config.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });

  it('proves active core runtime contracts that production jobs already require', () => {
    for (const table of [
      'intelligence_items',
      'intelligence_calendar_suggestions',
      'email_notification_events',
      'vendor_review_history',
    ]) {
      expect(postconditions).toContain(table);
    }
    expect(postconditions).toContain("table_name = 'vendors'");
    expect(postconditions).toContain("column_name = 'next_review_at'");
    expect(postconditions).toContain("table_name = 'email_notification_events'");
    expect(postconditions).toContain("column_name = 'entity_id'");
    expect(postconditions).toContain('public.create_organization_with_owner_atomic(text,text,uuid)');
    expect(postconditions).toContain("policyname like 'live_rls_%'");
    expect(postconditions).toContain('temporary live RLS validation helper remains after core reconciliation');
    expect(postconditions).toContain('legacy direct subscription mutation policy remains after core reconciliation');
  });

  it('proves the Break-Glass tenant and backend-only postconditions', () => {
    for (const table of [
      'enterprise_break_glass_requests',
      'enterprise_break_glass_approvals',
      'enterprise_break_glass_events',
      'enterprise_break_glass_reviews',
    ]) {
      expect(postconditions).toContain(table);
    }
    expect(postconditions).toContain('organization_members_organization_id_id_key');
    expect(postconditions).toContain('enterprise_break_glass_requests_organization_id_id_key');
    expect(postconditions).toContain('enterprise_break_glass_target_tenant_fk');
    expect(postconditions).toContain('enterprise_break_glass_approvals_request_tenant_fk');
    expect(postconditions).toContain('enterprise_break_glass_events_request_tenant_fk');
    expect(postconditions).toContain('enterprise_break_glass_reviews_request_tenant_fk');
    expect(postconditions).toContain('break-glass RLS/FORCE RLS boundary is incomplete');
    expect(postconditions).toContain("grantee in ('anon','authenticated')");
    expect(postconditions).toContain('public.expire_enterprise_break_glass_requests(integer)');
    expect(postconditions).toContain("setting = 'search_path=pg_catalog'");
  });
});
