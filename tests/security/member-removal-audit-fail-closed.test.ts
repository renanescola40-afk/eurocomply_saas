import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const route=readFileSync('src/app/api/team/members/remove/route.ts','utf8');
const action=readFileSync('src/server/actions/members.ts','utf8');
const helper=readFileSync('src/server/queries/audit-events.ts','utf8');
const sql=readFileSync('supabase/migrations/20261018113000_atomic_member_removal_with_chained_audit.sql','utf8');

describe('atomic membership removal audit persistence (source contract, not provider proof)',()=>{
  it('runs delete, tamper-evident audit chain and legacy audit insert in one transaction',()=>{
    const remove=sql.indexOf('from public.remove_organization_member_atomic(');
    const append=sql.indexOf('perform public.append_audit_event_chained(');
    const legacy=sql.indexOf('insert into public.audit_logs');
    expect(remove).toBeGreaterThan(-1);
    expect(append).toBeGreaterThan(remove);
    expect(legacy).toBeGreaterThan(append);
    expect(sql).toContain('begin;');expect(sql).toContain('commit;');
    expect(sql).not.toContain('exception\n');
  });
  it('never compensates an audit error with a second client-side membership insert',()=>{
    expect(route).toContain('removeMemberWithChainedAuditAtomic');
    expect(route).not.toContain('rollbackError');
    expect(route).not.toContain('createAuditEvent(');
    expect(action.slice(action.indexOf('export async function removeOrganizationMember'))).not.toContain('insert(');
  });
  it('fails closed without a signature or on a provider error, with bounded retry',()=>{
    expect(helper).toContain("error: 'audit_signing_unavailable'");
    expect(helper).toContain("error: 'atomic_audit_or_member_removal_failed'");
    expect(helper).toContain('attempt <= 3');
    expect(helper).toContain('isPreviousHashMismatch(error)');
    expect(sql).toContain("'permission_denied'::text");
    expect(sql).toContain("'invalid_input'::text");
  });
});
