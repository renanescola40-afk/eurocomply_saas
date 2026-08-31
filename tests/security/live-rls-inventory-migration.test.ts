import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historicalMigrationPath =
  'supabase/migrations/20260730204500_repair_live_rls_validation_inventory.sql';
const forwardMigrationPath =
  'supabase/migrations/20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql';
const historicalMigration = readFileSync(historicalMigrationPath, 'utf8').toLowerCase();
const forwardMigration = readFileSync(forwardMigrationPath, 'utf8').toLowerCase();
const workflow = readFileSync(
  '.github/workflows/supabase-live-rls-validation.yml',
  'utf8',
).toLowerCase();
const runner = readFileSync(
  'scripts/security/run-supabase-live-tenant-isolation-v4.mjs',
  'utf8',
).toLowerCase();
const forwardConfig = JSON.parse(
  readFileSync('config/supabase-forward-reconciliation-v23.json', 'utf8'),
) as { migrations: Array<{ filename: string }> };
const selectedForwardMigrations = forwardConfig.migrations.map((item) => item.filename);

describe('live RLS inventory repair migration', () => {
  it('recreates the exact RPC signature required by the live proof runner', () => {
    expect(historicalMigration).toContain(
      'create or replace function public.eurocomply_live_rls_inventory(table_names text[])',
    );
    expect(historicalMigration).toContain('returns table (');
    expect(historicalMigration).toContain('rls_enabled boolean');
    expect(historicalMigration).toContain('force_rls boolean');
    expect(historicalMigration).toContain('policy_count integer');
  });

  it('uses invoker rights and a fixed search path', () => {
    expect(historicalMigration).toContain('security invoker');
    expect(historicalMigration).toContain('set search_path = public, pg_catalog');
    expect(historicalMigration).not.toContain('security definer');
  });

  it('removes public application access and grants only service-role execution', () => {
    expect(historicalMigration).toContain(
      'revoke all on function public.eurocomply_live_rls_inventory(text[]) from public;',
    );
    expect(historicalMigration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon;',
    );
    expect(historicalMigration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated;',
    );
    expect(historicalMigration).toContain(
      'grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role;',
    );
  });

  it('documents the controlled purpose and reloads the PostgREST schema', () => {
    expect(historicalMigration).toContain(
      'controlled service-role helper for exact-target live rls validation',
    );
    expect(historicalMigration).toContain("notify pgrst, 'reload schema';");
  });

  it('reconciles the helper only through the governed forward promotion package', () => {
    expect(selectedForwardMigrations).toContain(
      '20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql',
    );
    expect(selectedForwardMigrations).not.toContain(
      '20260730204500_repair_live_rls_validation_inventory.sql',
    );
    expect(workflow).not.toContain('apply allowlisted live rls proof migrations');
    expect(workflow).not.toContain('--single-transaction --file="$migration"');
    expect(workflow).not.toContain('psql ');
  });

  it('requires exact successful promotion evidence before the tenant proof executes', () => {
    expect(workflow).toContain('download exact governed production promotion evidence');
    expect(workflow).toContain('validate-supabase-live-promotion-source.mjs');
    expect(workflow).toContain('execute canonical live tenant-isolation proof');
    expect(workflow.indexOf('download exact governed production promotion evidence')).toBeLessThan(
      workflow.indexOf('execute canonical live tenant-isolation proof'),
    );
  });

  it('preserves the helper privilege boundary in the forward reconciliation identity and proves authenticated denial at runtime', () => {
    expect(forwardMigration).toContain('security invoker');
    expect(forwardMigration).toContain('set search_path = public, pg_catalog');
    expect(forwardMigration).toContain(
      'revoke all on function public.eurocomply_live_rls_inventory(text[]) from public',
    );
    expect(forwardMigration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon',
    );
    expect(forwardMigration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated',
    );
    expect(forwardMigration).toContain(
      'grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role',
    );
    expect(runner).toContain("admin.rpc('eurocomply_live_rls_inventory'");
    expect(runner).toContain("clients.ownerb.rpc('eurocomply_live_rls_inventory'");
    expect(runner).toContain("operation: 'authenticated_execute_denied'");
  });

  it('keeps the live proof read-only with respect to migration execution', () => {
    expect(workflow).toContain('run: node scripts/security/run-supabase-live-tenant-isolation.mjs');
    expect(workflow).not.toContain('supabase db push');
    expect(workflow).not.toContain('migration repair');
    expect(workflow).not.toContain('--include-all');
  });
});
