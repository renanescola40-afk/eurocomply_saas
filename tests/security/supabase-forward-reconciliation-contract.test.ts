import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
  migrations: Array<{ filename: string }>;
  truthBoundary: Record<string, boolean>;
};
const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
const dryRun = readFileSync('.github/workflows/supabase-forward-reconciliation-dry-run.yml', 'utf8');
const postconditions = readFileSync('scripts/supabase/verify-forward-reconciliation-postconditions.sql', 'utf8');

const selected = config.migrations.map((migration) => migration.filename);

describe('bounded Supabase forward reconciliation contract', () => {
  it('selects exactly the six reviewed forward-only reconciliations', () => {
    expect(selected).toEqual([
      '20260813175000_optimize_organization_add_ons_rls_initplan.sql',
      '20260813194500_reconcile_step_up_challenges_runtime.sql',
      '20260813200000_reconcile_subscription_schema_defaults.sql',
      '20260813201500_reconcile_controlled_document_storage.sql',
      '20260813201600_force_tasks_rls.sql',
      '20260813234000_reconcile_enterprise_break_glass_governance.sql',
    ]);
    expect(config.truthBoundary).toMatchObject({
      automaticClassification: false,
      productionWriteAuthorizedByConfig: false,
      migrationHistoryRepairAllowed: false,
      unrestrictedDbPushAllowed: false,
      onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
    });
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

  it('keeps the dry-run write boundary fail-closed', () => {
    expect(dryRun).toContain('db push --dry-run --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(dryRun).not.toContain('db push --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(rehearsal).toContain('productionWritePerformed=false');
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
