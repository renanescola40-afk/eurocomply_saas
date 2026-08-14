import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(
  readFileSync('config/supabase-forward-reconciliation.json', 'utf8'),
) as {
  migrations: Array<{ filename: string; purpose: string }>;
  truthBoundary: Record<string, boolean>;
};
const rehearsal = readFileSync(
  '.github/workflows/supabase-forward-reconciliation-rehearsal.yml',
  'utf8',
);
const dryRun = readFileSync(
  '.github/workflows/supabase-forward-reconciliation-dry-run.yml',
  'utf8',
);
const postconditions = readFileSync(
  'scripts/supabase/verify-forward-reconciliation-postconditions.sql',
  'utf8',
);
const migration = readFileSync(
  'supabase/migrations/20260813234000_reconcile_enterprise_break_glass_governance.sql',
  'utf8',
);
const decision = readFileSync(
  'docs/security/decisions/2026-08-13-enterprise-break-glass-unapplied-history.md',
  'utf8',
);

const breakGlassFilename = '20260813234000_reconcile_enterprise_break_glass_governance.sql';
const selectedFilenames = config.migrations.map(({ filename }) => filename);

describe('bounded Enterprise Break-Glass reconciliation', () => {
  it('selects the forward-only Break-Glass migration without authorizing production write shortcuts', () => {
    expect(selectedFilenames).toHaveLength(6);
    expect(selectedFilenames).toContain(breakGlassFilename);
    expect(new Set(selectedFilenames).size).toBe(selectedFilenames.length);
    expect(config.truthBoundary).toMatchObject({
      automaticClassification: false,
      productionWriteAuthorizedByConfig: false,
      migrationHistoryRepairAllowed: false,
      unrestrictedDbPushAllowed: false,
      onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
    });
  });

  it('revalidates the selected Break-Glass bytes whenever either bounded workflow is affected', () => {
    const path = `supabase/migrations/${breakGlassFilename}`;
    expect(rehearsal).toContain(`- '${path}'`);
    expect(dryRun).toContain(`- '${path}'`);
    expect(rehearsal).toContain("--expected-sha=\"$TARGET_SHA\"");
    expect(dryRun).toContain("--expected-sha=\"$TARGET_SHA\"");
  });

  it('keeps rehearsal and remote validation non-writing', () => {
    expect(rehearsal).toContain('.checks.productionWriteAuthorized == false');
    expect(rehearsal).toContain('.checks.migrationHistoryRepairAuthorized == false');
    expect(rehearsal).toContain('.checks.unrestrictedDbPushAuthorized == false');
    expect(dryRun).toContain('db push --dry-run');
    expect(dryRun).not.toContain('db push --include-all');
    expect(dryRun).not.toContain('migration repair');
  });

  it('proves tenant-safe Break-Glass keys, RLS, ACL and function security after apply', () => {
    for (const marker of [
      'organization_members_organization_id_id_key',
      'enterprise_break_glass_requests_organization_id_id_key',
      'enterprise_break_glass_target_tenant_fk',
      'enterprise_break_glass_approvals_request_tenant_fk',
      'enterprise_break_glass_events_request_tenant_fk',
      'enterprise_break_glass_reviews_request_tenant_fk',
      'break-glass RLS/FORCE RLS boundary is incomplete',
      'browser roles unexpectedly retain break-glass table privileges',
      'service_role break-glass table privileges are incomplete',
      'public.expire_enterprise_break_glass_requests(integer)',
      "setting = 'search_path=pg_catalog'",
    ]) {
      expect(postconditions).toContain(marker);
    }
  });

  it('preserves the historical lineage boundary instead of rewriting or repairing it', () => {
    expect(decision).toContain('Historical file: `supabase/migrations/20260727160000_enterprise_break_glass_governance.sql`');
    expect(decision).toContain('Forward reconciliation: `supabase/migrations/20260813234000_reconcile_enterprise_break_glass_governance.sql`');
    expect(decision).toContain('Production history action: none');
    expect(decision).toContain('Production write authorized by this document: no');
    expect(decision).toContain('`RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false`');
    expect(migration).toContain('historical 20260727160000 migration was never applied');
    expect(migration).toContain('rewriting historical migration records');
  });
});
