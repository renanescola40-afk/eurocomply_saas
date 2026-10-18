import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const migration = readFileSync('supabase/migrations/20261018190000_reconcile_audited_membership_usage_counters.sql','utf8');
const split=migration.indexOf('create or replace function public.change_organization_member_role_audited_atomic(');
const remove=migration.slice(migration.indexOf('create or replace function public.remove_organization_member_audited_atomic('),split);
const role=migration.slice(split);
describe('P0-F: audited membership changes reconcile organization usage (source only)',()=>{
  it('requires P0-C/D and all usage columns before changing functions',()=>{
    expect(migration).toContain('P0-F requires P0-C/P0-D audited membership RPCs');
    expect(migration).toContain('count(*) from information_schema.columns');
    expect(migration).toContain("<> 7");
  });
  it('acquires usage before tenant member locks for removal',()=>{
    expect(remove.indexOf('where usage.organization_id = p_organization_id')).toBeLessThan(remove.indexOf('order by om.id for update'));
    expect(remove).toContain('from public.remove_organization_member_atomic(');
  });
  it.each([['remove',remove,"'removed'"],['role',role,"'changed'"]])('%s counters stay atomic with signed audit',(_,source,outcome)=>{
    const prior=source.indexOf("if v_outcome is distinct from "+outcome);
    const count=source.indexOf('with counted as (');
    const chain=source.indexOf('perform public.append_audit_event_chained(');
    expect(prior).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(prior);
    expect(chain).toBeGreaterThan(count);
    for(const col of ['active_members','full_users','participants','viewers','active_admins']){
      expect(source).toContain(col+' = counted.'+col);
    }
    expect(source).toContain('P0-F organization usage reconciliation failed');
    expect(source).toContain('insert into public.audit_logs');
  });
  it('restricts both SECURITY DEFINER writers to service_role',()=>{
    expect((migration.match(/security definer/g)||[]).length).toBe(2);
    expect((migration.match(/from public, anon, authenticated/g)||[]).length).toBe(2);
    expect((migration.match(/to service_role;/g)||[]).length).toBe(2);
    expect(migration.trim().endsWith('commit;')).toBe(true);
  });
});
