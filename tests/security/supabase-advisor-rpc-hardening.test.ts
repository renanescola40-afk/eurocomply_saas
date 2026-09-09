import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const migrationPath = 'supabase/migrations/20260909006900_harden_security_advisor_rpc_surface.sql';
const migration = read(migrationPath);
const reconciliation = read('config/supabase-forward-reconciliation.json');

describe('Supabase Security Advisor RPC hardening', () => {
  it('moves Enterprise SECURITY DEFINER membership helpers out of the exposed public schema', () => {
    expect(migration).toContain("alter function public.enterprise_member_can_read(uuid) set schema app_private");
    expect(migration).toContain("alter function public.enterprise_member_can_manage(uuid) set schema app_private");
    expect(migration).toContain(
      'revoke all on function app_private.enterprise_member_can_read(uuid) from public, anon;',
    );
    expect(migration).toContain(
      'revoke all on function app_private.enterprise_member_can_manage(uuid) from public, anon;',
    );
    expect(migration).toContain(
      'grant execute on function app_private.enterprise_member_can_read(uuid) to authenticated, service_role;',
    );
    expect(migration).toContain(
      'grant execute on function app_private.enterprise_member_can_manage(uuid) to authenticated, service_role;',
    );
  });

  it('fixes the mutable search_path finding without weakening append-only enforcement', () => {
    expect(migration).toContain('alter function if exists public.prevent_ai_qms_decision_mutation()');
    expect(migration).toContain('set search_path = pg_catalog;');
    expect(migration).not.toContain('disable row level security');
    expect(migration).not.toContain('security invoker');
  });

  it('registers v41 after the proven v40 cross-tenant hardening head', () => {
    expect(reconciliation).toContain('2026-09-09-supabase-advisor-rpc-hardening-v41');
    expect(reconciliation.indexOf('20260908006800_harden_cross_tenant_reference_integrity.sql'))
      .toBeLessThan(reconciliation.indexOf('20260909006900_harden_security_advisor_rpc_surface.sql'));
    expect(reconciliation).toContain('"productionWriteAuthorizedByConfig": false');
    expect(reconciliation).toContain('"unrestrictedDbPushAllowed": false');
  });
});
