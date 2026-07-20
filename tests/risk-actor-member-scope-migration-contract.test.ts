import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260719184500_enforce_risk_actor_member_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('risk actor organization member scope migration', () => {
  it('validates risk actors against organization membership', () => {
    expect(migration).toContain('create or replace function public.enforce_risk_actor_member_scope()');
    expect(migration).toContain('membership.organization_id = new.organization_id');
    expect(migration).toContain('membership.user_id = scoped_user_id');
    expect(migration).toContain("raise exception 'risk_actor_not_organization_member'");
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers creators and owners on insert and scope-changing updates', () => {
    expect(migration).toContain("tg_argv[0] = 'created_by'");
    expect(migration).toContain('scoped_user_id := new.created_by');
    expect(migration).toContain("tg_argv[0] = 'owner_user_id'");
    expect(migration).toContain('scoped_user_id := new.owner_user_id');
    expect(migration).toContain('before insert or update of organization_id, created_by');
    expect(migration).toContain('before insert or update of organization_id, owner_user_id');
  });

  it('preserves nullable actor references', () => {
    expect(migration).toContain('if scoped_user_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the security-definer function for direct execution', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain('revoke all on function public.enforce_risk_actor_member_scope() from public;');
    expect(migration).toContain('revoke all on function public.enforce_risk_actor_member_scope() from anon;');
    expect(migration).toContain('revoke all on function public.enforce_risk_actor_member_scope() from authenticated;');
  });
});
