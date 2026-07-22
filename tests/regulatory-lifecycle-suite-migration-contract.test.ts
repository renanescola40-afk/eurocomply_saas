import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260722190000_regulatory_lifecycle_suite.sql', 'utf8');

describe('regulatory lifecycle suite migration', () => {
  it('uses tenant-scoped forced-RLS persistence', () => {
    expect(migration).toContain('create table if not exists public.ai_regulatory_programs');
    expect(migration).toContain('organization_id uuid not null');
    expect(migration.match(/force row level security/g)?.length).toBe(3);
    expect(migration).toContain('revoke all on public.ai_regulatory_programs');
  });

  it('creates and approves programs atomically', () => {
    expect(migration).toContain('create_ai_regulatory_program_atomic');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('approve_ai_regulatory_program_atomic');
    expect(migration).toContain("status='approved'");
    expect(migration).toContain('ai_regulatory_program_decisions');
  });

  it('restricts RPC execution to service role', () => {
    expect(migration).toContain('from public,anon,authenticated');
    expect(migration).toContain('to service_role');
  });
});
