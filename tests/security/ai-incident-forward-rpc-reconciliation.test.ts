import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20261003173930_reconcile_ai_incident_atomic_rpc.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('AI incident atomic RPC forward reconciliation', () => {
  it('recreates the production atomic incident and audit-chain authority', () => {
    expect(migration).toContain('create or replace function public.create_ai_incident_with_audit_atomic');
    expect(migration).toContain("perform pg_advisory_xact_lock(hashtext(p_organization_id::text));");
    expect(migration).toContain("raise exception 'audit chain previous hash mismatch'");
    expect(migration).toContain("'ai_incident_created'");
    expect(migration).toContain("return query select 'created'::text, to_jsonb(v_incident)");
  });

  it('keeps browser roles unable to invoke the security-definer mutation RPC', () => {
    expect(migration).toContain('from anon;');
    expect(migration).toContain('from authenticated;');
    expect(migration).toContain('to service_role;');
    expect(migration).toContain("set search_path = 'pg_catalog', 'public'");
  });
});
