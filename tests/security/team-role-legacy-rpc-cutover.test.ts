import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  'supabase/reconciliation/20261018210000_retire_legacy_member_role_after_cutover.sql',
  'utf8',
);
const adapter = readFileSync('src/server/queries/audit-events.ts', 'utf8');
const route = readFileSync('src/app/api/team/members/role/route.ts', 'utf8');

describe('P0-D legacy role change RPC retirement (MANUAL CUTOVER, source contract only)', () => {
  it('keeps the legacy retirement out of forward auto migrations', () => {
    expect(sql).toContain('FINAL MANUAL CUTOVER ONLY');
    expect(sql).toContain('NOT an automatic migration');
    expect(sql).toContain('do $preflight$');
    expect(sql).toContain('do $postcondition$');
  });

  it('blocks cutover without the audited role and completed P0-C removal dependencies', () => {
    expect(sql).toContain("to_regprocedure('public.change_organization_member_role_audited_atomic(");
    expect(sql).toContain("to_regprocedure('public.remove_organization_member_audited_atomic(");
    expect(sql).toContain("has_function_privilege('service_role', v_legacy_removal, 'EXECUTE')");
    expect(sql).toContain("not has_function_privilege('service_role', v_audited_removal, 'EXECUTE')");
    expect(sql).toContain("has_function_privilege(v_owner, v_legacy, 'EXECUTE')");
  });

  it('removes only direct legacy service role execution while preserving audited execution', () => {
    expect(sql).toContain('revoke execute on function public.change_organization_member_role_atomic(uuid,uuid,text,text)');
    expect(sql).toContain('from service_role;');
    expect(sql).toContain("has_function_privilege('service_role', v_legacy, 'EXECUTE')");
    expect(sql).toContain("not has_function_privilege('service_role', v_audited, 'EXECUTE')");
    expect(sql).toContain("has_function_privilege('anon', v_audited, 'EXECUTE')");
    expect(sql).toContain("has_function_privilege('authenticated', v_audited, 'EXECUTE')");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });

  it('ensures the active role API calls only the audited transaction', () => {
    expect(route).toContain('changeMemberRoleWithChainedAuditAtomic({');
    expect(route).not.toContain("supabase.rpc('change_organization_member_role_atomic'");
    expect(adapter).toContain("admin.rpc('change_organization_member_role_audited_atomic'");
  });
});
