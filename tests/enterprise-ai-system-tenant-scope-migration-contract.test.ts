import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260719150000_enforce_enterprise_ai_system_tenant_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('enterprise governance AI system tenant scope migration', () => {
  it('requires the referenced AI system to belong to the governance record organization', () => {
    expect(migration).toContain(
      'create or replace function public.enforce_enterprise_ai_system_tenant_scope()'
    );
    expect(migration).toContain('scoped_system.id = new.ai_system_id');
    expect(migration).toContain('scoped_system.organization_id = new.organization_id');
    expect(migration).toContain("raise exception 'enterprise_ai_system_not_in_organization'");
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers vendor diligence and risk reviews on insert and scope-changing updates', () => {
    expect(migration).toContain('on public.enterprise_vendor_due_diligence');
    expect(migration).toContain('on public.enterprise_risk_reviews');
    expect(migration.match(/before insert or update of organization_id, ai_system_id/g)).toHaveLength(2);
  });

  it('preserves records without an AI system reference', () => {
    expect(migration).toContain('if new.ai_system_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the security-definer function for direct execution', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from public;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from anon;'
    );
    expect(migration).toContain(
      'revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from authenticated;'
    );
  });
});
