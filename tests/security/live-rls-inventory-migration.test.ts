import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260730204500_repair_live_rls_validation_inventory.sql';
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();
const workflow = readFileSync(
  '.github/workflows/supabase-live-rls-validation.yml',
  'utf8',
).toLowerCase();

describe('live RLS inventory repair migration', () => {
  it('recreates the exact RPC signature required by the live proof runner', () => {
    expect(migration).toContain(
      'create or replace function public.eurocomply_live_rls_inventory(table_names text[])',
    );
    expect(migration).toContain('returns table (');
    expect(migration).toContain('rls_enabled boolean');
    expect(migration).toContain('force_rls boolean');
    expect(migration).toContain('policy_count integer');
  });

  it('uses invoker rights and a fixed search path', () => {
    expect(migration).toContain('security invoker');
    expect(migration).toContain('set search_path = public, pg_catalog');
    expect(migration).not.toContain('security definer');
  });

  it('removes public application access and grants only service-role execution', () => {
    expect(migration).toContain(
      'revoke all on function public.eurocomply_live_rls_inventory(text[]) from public;',
    );
    expect(migration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon;',
    );
    expect(migration).toContain(
      'revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated;',
    );
    expect(migration).toContain(
      'grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role;',
    );
  });

  it('documents the controlled purpose and reloads the PostgREST schema', () => {
    expect(migration).toContain(
      'controlled service-role helper for exact-target live rls validation',
    );
    expect(migration).toContain("notify pgrst, 'reload schema';");
  });

  it('uses only the repaired helper in the controlled live proof allowlist', () => {
    expect(workflow).toContain(
      'supabase/migrations/20260730204500_repair_live_rls_validation_inventory.sql',
    );
    expect(workflow).not.toContain(
      'supabase/migrations/20260623120000_live_rls_validation_inventory.sql',
    );
    expect(workflow).toContain('--single-transaction --file="$migration"');
  });

  it('runs this contract before any optional target migration application', () => {
    expect(workflow).toContain(
      'tests/security/live-rls-inventory-migration.test.ts',
    );
    expect(workflow.indexOf('validate supabase rls proof contracts')).toBeLessThan(
      workflow.indexOf('apply allowlisted live rls proof migrations'),
    );
  });
});
