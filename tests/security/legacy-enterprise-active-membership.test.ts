import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  'supabase/migrations/20260825171500_harden_active_membership_rls_authority.sql',
  'utf8',
);

describe('legacy Enterprise active membership boundary', () => {
  it('hardens legacy read/manage helpers only when those historical helpers exist', () => {
    expect(sql).toContain("to_regprocedure('public.enterprise_member_can_read(uuid)') is not null");
    expect(sql).toContain("to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null");
    expect(sql).toContain('create or replace function public.enterprise_member_can_read');
    expect(sql).toContain('create or replace function public.enterprise_member_can_manage');
    expect(sql).toContain("legacy enterprise read membership helper is not active-membership aware");
    expect(sql).toContain("legacy enterprise manage membership helper is not active-membership aware");
  });

  it('preserves the legacy manager role contract while adding active status', () => {
    expect(sql).toContain("lower(coalesce(om.role, 'viewer')) in ('owner', 'admin', 'editor', 'compliance_manager')");
    const activePredicates = sql.match(/lower\(coalesce\(om\.status, ''\)\) = 'active'/g) ?? [];
    expect(activePredicates.length).toBeGreaterThanOrEqual(4);
  });
});
